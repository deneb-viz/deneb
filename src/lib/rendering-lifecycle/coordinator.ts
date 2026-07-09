import type powerbi from 'powerbi-visuals-api';

import {
    SUPERSEDED_FAILURE_REASON,
    type RenderingLifecycleCoordinator,
    type RenderingLifecycleCoordinatorTestSurface,
    type RenderingLifecycleEmitter,
    type RenderingLifecycleId,
    type RenderingLifecycleLogger,
    type RenderingLifecycleObserver,
    type SafetyNetHandle,
    type SafetyNetScheduler
} from './types';

/**
 * Per-id state captured at `open()` time. Lives in the `openIds` Map
 * only while the lifecycle is OPEN — the entry is removed when the id
 * terminally closes (close, fail, or supersede), so the Map's
 * presence/absence is the exactly-once guard and the Map can only
 * ever hold open ids. No separate `closed` flag is needed.
 *
 *  - `renderStarted` flips true via `markRenderStarted` /
 *    `markPendingRenderStarted`; consumed by
 *    `closePendingRenderSettle` to DEFER the settle-timer close of an
 *    in-flight render (the safety-net no longer branches on it — it
 *    terminally closes any still-open id at the bound).
 *  - `safetyNet` holds the cancellation handle while the safety-net
 *    is armed and not yet fired/cancelled.
 */
type OpenIdState = {
    options: powerbi.extensibility.visual.VisualUpdateOptions;
    renderStarted: boolean;
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
 *     the new id, so the openIds map can only ever contain one entry.
 *  2. **Exactly-once terminal emission per id.** The openIds map only
 *     contains OPEN ids — terminal paths delete the entry from the
 *     map. The first close/fail wins and deletes the entry; any
 *     subsequent attempt (stale callback, double-close) finds
 *     nothing in the map and no-ops. Map absence is the guard;
 *     there is no separate `closed` flag.
 *  3. **State mutation precedes host emission for any terminal.** The
 *     entry is removed from the map and the observer event is
 *     pushed BEFORE the host's `renderingFinished` /
 *     `renderingFailed` call. If the host throws on the emission,
 *     the id is still gone from the map — a subsequent attempt
 *     finds nothing and no-ops. This is the "truthful-or-loud"
 *     invariant: either the host saw the terminal, or the throw
 *     propagates and the update is aborted (no half-closed limbo).
 *  4. **`open()` records the new id in `openIds` AFTER the host's
 *     `renderingStarted` returns successfully.** If the host throws,
 *     the id is never recorded and `failCurrent()` in the catch path
 *     finds no current id and no-ops — no orphan accumulates.
 *  5. **The map's size is bounded by invariant #1, not by session
 *     length.** This matters for long-running published reports
 *     (live streaming dashboards with frequent refreshes) where the
 *     visual is not torn down per-update the way Power BI Desktop
 *     would tear it down. Without deletion the map would grow
 *     monotonically and `currentOpenId()` would degrade to O(n);
 *     with deletion it is at most one entry and lookup is O(1).
 */
export const createRenderingLifecycleCoordinator = (
    deps: CreateRenderingLifecycleCoordinatorDeps
): RenderingLifecycleCoordinatorTestSurface => {
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
     * Return the currently-open id, or null. Per invariant #1 the
     * map holds at most one entry; the loop terminates after the
     * first key. O(1) regardless of session length.
     */
    const currentOpenId = (): RenderingLifecycleId | null => {
        for (const id of openIds.keys()) return id;
        return null;
    };

    const closeInternal = (
        id: RenderingLifecycleId,
        via: 'sync-current' | 'async-pending-render' | 'safety-net'
    ): void => {
        const state = openIds.get(id);
        if (!state) return;
        if (state.safetyNet) {
            state.safetyNet.cancel();
            state.safetyNet = null;
        }
        // Delete BEFORE host emission. If the host throws on the
        // terminal, the entry is still gone from the map — a
        // subsequent attempt (e.g. update()'s catch routing to
        // failCurrent) finds nothing and no-ops. See invariant #3.
        openIds.delete(id);
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
        if (!state) return;
        if (state.safetyNet) {
            state.safetyNet.cancel();
            state.safetyNet = null;
        }
        openIds.delete(id);
        const reason = deriveReason(error);
        log(`[lifecycle] renderingFailed id=${id} reason=${reason} via=${via}`);
        observe({ kind: 'failed', id, reason, error, via });
        emitter.renderingFailed(state.options, reason);
    };

    const markRenderStartedInternal = (id: RenderingLifecycleId): void => {
        const state = openIds.get(id);
        if (!state) return;
        if (state.renderStarted) return;
        state.renderStarted = true;
        log(`[lifecycle] renderStarted id=${id}`);
        observe({ kind: 'render-started', id });
    };

    const onSafetyNetTick = (id: RenderingLifecycleId): void => {
        const state = openIds.get(id);
        if (!state) {
            // Already closed normally — the close cancelled this
            // handle, so reaching here means the map entry is gone.
            // Inert.
            observe({ kind: 'safety-net-tick', id, result: 'inert' });
            return;
        }
        // TRUE backstop (audit H2): the id is STILL OPEN at the bound,
        // so no other terminal fired — close it now, whether the render
        // started or not. Reaching this point means either the render
        // never began (orphan) OR it began but never signalled
        // completion (started-but-stuck); both leave the host with an
        // orphaned `renderingStarted` unless closed here.
        //
        // Before U5 an in-flight (`renderStarted === true`) id was
        // DEFERRED here (returned without closing, no re-arm). That was
        // only safe because the 500ms settle timer was accidentally
        // acting as the terminal for started-but-stuck renders. Now that
        // the settle timer itself defers on in-flight (its own H2 fix,
        // `closePendingRenderSettle`), deferring here too would leave a
        // stuck render's lifecycle open forever — replacing early-finish
        // with never-finish. The bound is unchanged (R9,
        // `SAFETY_NET_BOUND_MS = 10_000`); only the tick's decision
        // changes from defer to terminal close. No re-arm, no longer
        // wait.
        observe({ kind: 'safety-net-tick', id, result: 'closed' });
        closeInternal(id, 'safety-net');
    };

    // ─── Public surface ─────────────────────────────────────────────────────

    const open: RenderingLifecycleCoordinator['open'] = (options) => {
        // Supersede any prior open ids BEFORE minting the new id. The
        // invariant says at most one such id exists; iterating
        // defensively costs nothing and survives any future change.
        // Map.prototype iteration tolerates concurrent deletion of
        // the visited key, so deleting inside the loop is safe.
        for (const [oldId, state] of openIds) {
            if (state.safetyNet) {
                state.safetyNet.cancel();
                state.safetyNet = null;
            }
            // Delete BEFORE the host emission. If the host throws on
            // the supersede `renderingFailed` call, the entry is
            // still gone — a subsequent `update()`-catch route to
            // `failCurrent()` finds no current id and no-ops. See
            // invariant #3 and the "loud throws" test.
            openIds.delete(oldId);
            log(
                `[lifecycle] renderingFailed id=${oldId} reason=${SUPERSEDED_FAILURE_REASON} via=superseded`
            );
            observe({
                kind: 'failed',
                id: oldId,
                reason: SUPERSEDED_FAILURE_REASON,
                via: 'superseded'
            });
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
            safetyNet: null
        });
        observe({ kind: 'opened', id, options });
        return id;
    };

    const bindPendingRender: RenderingLifecycleCoordinator['bindPendingRender'] =
        (id) => {
            pendingRenderId = id;
        };

    const bindPendingRenderCurrent: RenderingLifecycleCoordinator['bindPendingRenderCurrent'] =
        () => {
            const id = currentOpenId();
            if (id === null) return;
            pendingRenderId = id;
        };

    const armSafetyNet: RenderingLifecycleCoordinator['armSafetyNet'] = (
        id
    ) => {
        const state = openIds.get(id);
        if (!state) return;
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

    const closePendingRenderSettle: RenderingLifecycleCoordinator['closePendingRenderSettle'] =
        () => {
            if (pendingRenderId === null) return;
            const state = openIds.get(pendingRenderId);
            // Already closed (exactly-once guard) or never opened —
            // no-op, exactly like `closePendingRender`.
            if (!state) return;
            // H2 defer: a render is in flight. Closing here would emit
            // `renderingFinished` mid-render, and Power BI's
            // export/snapshot service could capture pre-render content.
            // Leave the id open — the embed's own `onRenderingFinished`
            // (real close via `closePendingRender`) or the safety-net's
            // terminal-at-bound will close it. No re-arm; the settle
            // timer does not fire again for this id. Emits no observer
            // event by design (see `closePendingRenderSettle` on the
            // coordinator type: nothing mutates and the start-vs-close
            // tally must not count a deferred settle).
            if (state.renderStarted) return;
            // No render started (the non-Vega-affecting formatting-
            // change case this settle path targets): close terminally,
            // identical to `closePendingRender`.
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
    // round-tripping through pendingRenderId. Not on the production
    // `RenderingLifecycleCoordinator` type — see the JSDoc on
    // `RenderingLifecycleCoordinatorTestSurface`.
    const close: RenderingLifecycleCoordinatorTestSurface['close'] = (id) => {
        closeInternal(id, 'sync-current');
    };

    const fail: RenderingLifecycleCoordinatorTestSurface['fail'] = (
        id,
        error
    ) => {
        failInternal(id, error, 'sync-current');
    };

    const markRenderStarted: RenderingLifecycleCoordinatorTestSurface['markRenderStarted'] =
        (id) => {
            markRenderStartedInternal(id);
        };

    return {
        open,
        bindPendingRender,
        bindPendingRenderCurrent,
        armSafetyNet,
        closeCurrent,
        failCurrent,
        closePendingRender,
        closePendingRenderSettle,
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
