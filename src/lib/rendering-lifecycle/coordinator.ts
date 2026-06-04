import type powerbi from 'powerbi-visuals-api';

import {
    SUPERSEDED_FAILURE_REASON,
    type RenderingLifecycleCoordinator,
    type RenderingLifecycleEmitter,
    type RenderingLifecycleId,
    type RenderingLifecycleLogger,
    type RenderingLifecycleObserver,
    type SafetyNetHandle,
    type SafetyNetScheduler
} from './types';

/**
 * Per-id state captured at `open()` time. Mutated in place across the
 * lifecycle:
 *  - `renderStarted` flips true via `markRenderStarted` / `markPendingRenderStarted`
 *  - `closed` flips true on the FIRST close/fail terminal — protects
 *    against double-emission via the exactly-once guard
 *  - `safetyNet` holds the cancellation handle while the safety-net
 *    is armed and not yet fired/cancelled
 */
type OpenIdState = {
    options: powerbi.extensibility.visual.VisualUpdateOptions;
    renderStarted: boolean;
    closed: boolean;
    safetyNet: SafetyNetHandle | null;
};

const noopLogger: RenderingLifecycleLogger = () => undefined;
const noopObserver: RenderingLifecycleObserver = () => undefined;

export type CreateRenderingLifecycleCoordinatorDeps = {
    emitter: RenderingLifecycleEmitter;
    scheduler: SafetyNetScheduler;
    logger?: RenderingLifecycleLogger;
    observer?: RenderingLifecycleObserver;
};

/**
 * Construct a rendering lifecycle coordinator. See `types.ts` for the
 * public API contract; this factory wires the injected dependencies
 * and owns the internal state machine.
 *
 * Invariants the implementation enforces:
 *
 *  1. **At most one id is "current"** (unclosed) at any time. Every
 *     `open()` supersede-fails any prior unclosed id BEFORE minting
 *     the new id, so the openIds map can only ever contain one entry
 *     with `closed === false`.
 *  2. **Exactly-once terminal emission per id.** Every `closeInternal`
 *     / `failInternal` is gated on `!state.closed`; the first one
 *     wins, the rest no-op silently. Applies symmetrically to the
 *     safety-net's would-be close.
 *  3. **State mutation precedes host emission for any terminal.** The
 *     id is marked `closed = true` and the observer event is pushed
 *     BEFORE the host's `renderingFinished` / `renderingFailed` call.
 *     If the host throws on the emission, the id is still terminally
 *     closed — a subsequent attempt re-encounters `closed === true`
 *     and no-ops. This is the "truthful-or-loud" invariant: either
 *     the host saw the terminal, or the throw propagates and the
 *     update is aborted (no half-closed limbo).
 *  4. **`open()` records the new id in `openIds` AFTER the host's
 *     `renderingStarted` returns successfully.** If the host throws,
 *     the id is never recorded and `failCurrent()` in the catch path
 *     finds no current id and no-ops — no orphan accumulates.
 */
export const createRenderingLifecycleCoordinator = (
    deps: CreateRenderingLifecycleCoordinatorDeps
): RenderingLifecycleCoordinator => {
    const { emitter, scheduler } = deps;
    const log = deps.logger ?? noopLogger;
    const observe = deps.observer ?? noopObserver;

    const openIds = new Map<RenderingLifecycleId, OpenIdState>();
    let nextId = 1;
    let pendingRenderId: RenderingLifecycleId | null = null;

    const mintId = (): RenderingLifecycleId => {
        const id = nextId as RenderingLifecycleId;
        nextId++;
        return id;
    };

    /**
     * Locate the most-recently-opened id that has not yet closed.
     * Returns `null` when no current id exists (initial state, or
     * after a terminal emission has resolved the lifecycle, or when
     * `open()` threw before recording the new id).
     */
    const currentOpenId = (): RenderingLifecycleId | null => {
        const entries = Array.from(openIds.entries());
        for (let i = entries.length - 1; i >= 0; i--) {
            const [id, state] = entries[i];
            if (!state.closed) return id;
        }
        return null;
    };

    const closeInternal = (
        id: RenderingLifecycleId,
        via: 'sync-current' | 'async-pending-render' | 'safety-net'
    ): void => {
        const state = openIds.get(id);
        if (!state || state.closed) return;
        state.closed = true;
        if (state.safetyNet) {
            state.safetyNet.cancel();
            state.safetyNet = null;
        }
        log(`[lifecycle] renderingFinished id=${id} via=${via}`);
        observe({ kind: 'closed', id, via });
        emitter.renderingFinished(state.options);
    };

    const failInternal = (
        id: RenderingLifecycleId,
        error: unknown,
        via: 'sync-current' | 'async-pending-render' | 'superseded'
    ): void => {
        const state = openIds.get(id);
        if (!state || state.closed) return;
        state.closed = true;
        if (state.safetyNet) {
            state.safetyNet.cancel();
            state.safetyNet = null;
        }
        const reason = deriveReason(error);
        log(`[lifecycle] renderingFailed id=${id} reason=${reason} via=${via}`);
        observe({ kind: 'failed', id, reason, error, via });
        emitter.renderingFailed(state.options, reason);
    };

    const markRenderStartedInternal = (id: RenderingLifecycleId): void => {
        const state = openIds.get(id);
        if (!state || state.closed) return;
        if (state.renderStarted) return;
        state.renderStarted = true;
        log(`[lifecycle] renderStarted id=${id}`);
        observe({ kind: 'render-started', id });
    };

    const onSafetyNetTick = (id: RenderingLifecycleId): void => {
        const state = openIds.get(id);
        if (!state || state.closed) {
            observe({ kind: 'safety-net-tick', id, result: 'inert' });
            return;
        }
        if (state.renderStarted) {
            // In-flight render — extend the wait by NOT closing. The
            // caller (the render's own callback chain) will emit the
            // terminal in due course; or, if it never does, a future
            // arming would re-evaluate. For U7 there's no auto-rearm;
            // the practical safety case for in-flight is "the render
            // is happening, trust it" since the cert-blocking failure
            // mode is orphans, not slow renders.
            observe({ kind: 'safety-net-tick', id, result: 'deferred' });
            return;
        }
        observe({ kind: 'safety-net-tick', id, result: 'closed' });
        closeInternal(id, 'safety-net');
    };

    // ─── Public surface ─────────────────────────────────────────────────────

    const open: RenderingLifecycleCoordinator['open'] = (options) => {
        // Supersede any unclosed prior ids BEFORE minting the new id.
        // The invariant says at most one such id exists; iterating
        // defensively costs nothing and survives any future change.
        for (const [oldId, state] of openIds) {
            if (state.closed) continue;
            state.closed = true;
            if (state.safetyNet) {
                state.safetyNet.cancel();
                state.safetyNet = null;
            }
            log(
                `[lifecycle] renderingFailed id=${oldId} reason=${SUPERSEDED_FAILURE_REASON} via=superseded`
            );
            observe({
                kind: 'failed',
                id: oldId,
                reason: SUPERSEDED_FAILURE_REASON,
                via: 'superseded'
            });
            // Host emission AFTER the closed/observer transition is
            // committed. A host throw on the supersede emission does
            // NOT roll back the closed flag — see invariant #3 above
            // and the "loud throws" test.
            emitter.renderingFailed(state.options, SUPERSEDED_FAILURE_REASON);
        }

        // Mint and emit. If `renderingStarted` throws, the id is never
        // recorded — the throw propagates out and `failCurrent()` in
        // `update()`'s catch finds no current id and no-ops.
        const id = mintId();
        log(`[lifecycle] renderingStarted id=${id}`);
        emitter.renderingStarted(options);
        openIds.set(id, {
            options,
            renderStarted: false,
            closed: false,
            safetyNet: null
        });
        observe({ kind: 'opened', id, options });
        return id;
    };

    const bindPendingRender: RenderingLifecycleCoordinator['bindPendingRender'] =
        (id) => {
            pendingRenderId = id;
        };

    const armSafetyNet: RenderingLifecycleCoordinator['armSafetyNet'] = (
        id
    ) => {
        const state = openIds.get(id);
        if (!state || state.closed) return;
        const handle = scheduler.schedule(() => onSafetyNetTick(id));
        state.safetyNet = handle;
        observe({ kind: 'safety-net-armed', id });
    };

    const closeCurrent: RenderingLifecycleCoordinator['closeCurrent'] = () => {
        const id = currentOpenId();
        if (id === null) return;
        closeInternal(id, 'sync-current');
    };

    const failCurrent: RenderingLifecycleCoordinator['failCurrent'] = (
        error
    ) => {
        const id = currentOpenId();
        if (id === null) return;
        failInternal(id, error, 'sync-current');
    };

    const closePendingRender: RenderingLifecycleCoordinator['closePendingRender'] =
        () => {
            if (pendingRenderId === null) return;
            closeInternal(pendingRenderId, 'async-pending-render');
        };

    const failPendingRender: RenderingLifecycleCoordinator['failPendingRender'] =
        (error) => {
            if (pendingRenderId === null) return;
            failInternal(pendingRenderId, error, 'async-pending-render');
        };

    const markPendingRenderStarted: RenderingLifecycleCoordinator['markPendingRenderStarted'] =
        () => {
            if (pendingRenderId === null) return;
            markRenderStartedInternal(pendingRenderId);
        };

    // Id-bearing test-surface variants. Production code outside the
    // coordinator uses the no-arg variants above; these exist so unit
    // tests can drive deterministic supersede-order scenarios without
    // round-tripping through pendingRenderId.
    const close: RenderingLifecycleCoordinator['close'] = (id) => {
        closeInternal(id, 'sync-current');
    };

    const fail: RenderingLifecycleCoordinator['fail'] = (id, error) => {
        failInternal(id, error, 'sync-current');
    };

    const markRenderStarted: RenderingLifecycleCoordinator['markRenderStarted'] =
        (id) => {
            markRenderStartedInternal(id);
        };

    return {
        open,
        bindPendingRender,
        armSafetyNet,
        closeCurrent,
        failCurrent,
        closePendingRender,
        failPendingRender,
        markPendingRenderStarted,
        close,
        fail,
        markRenderStarted
    };
};

/**
 * Translate the catch-clause error value into the `reason` string the
 * Power BI host's `renderingFailed` accepts. `Error` instances yield
 * their `.message`; anything else stringifies. Kept simple
 * intentionally — the dev overlay (U11) reads the original error
 * value from the observer event for richer presentation; the reason
 * string is for the host channel only.
 */
const deriveReason = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
};
