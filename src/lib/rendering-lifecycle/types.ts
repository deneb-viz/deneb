import type powerbi from 'powerbi-visuals-api';

/**
 * Opaque, monotonic identity for one in-flight rendering lifecycle.
 * Minted by `coordinator.open()` and consumed by the coordinator's own
 * id-bearing methods and the safety-net. Treated as opaque by all
 * callers — branded `number` so a raw integer cannot be passed by
 * mistake.
 */
export type RenderingLifecycleId = number & {
    readonly __brand: 'RenderingLifecycleId';
};

/**
 * Minimal shape of the Power BI host's rendering event service the
 * coordinator depends on. Defined as a structural type so unit tests
 * can pass a plain mock without instantiating a full host. The real
 * implementation in `src/index.ts` injects `host.eventService`.
 *
 * `renderingFailed`'s optional `reason` is the Power BI host's
 * documented failure-detail slot — used for the synthetic "superseded"
 * marker emitted when a new `open()` displaces a still-open prior id.
 */
export type RenderingLifecycleEmitter = {
    renderingStarted: (
        options: powerbi.extensibility.visual.VisualUpdateOptions
    ) => void;
    renderingFinished: (
        options: powerbi.extensibility.visual.VisualUpdateOptions
    ) => void;
    renderingFailed: (
        options: powerbi.extensibility.visual.VisualUpdateOptions,
        reason?: string
    ) => void;
};

/**
 * Handle to a scheduled safety-net tick. Returned by the scheduler so
 * the coordinator can cancel an in-flight wait when the lifecycle
 * closes/fails before the bound elapses.
 */
export type SafetyNetHandle = {
    cancel: () => void;
};

/**
 * Abstraction over the timer that drives the safety-net's bounded
 * wait. Injected at construction so unit tests can run synthetic ticks
 * deterministically (no real `setTimeout`); production wires it to
 * `setTimeout` with a fixed bound.
 */
export type SafetyNetScheduler = {
    schedule: (callback: () => void) => SafetyNetHandle;
};

/**
 * Diagnostic sink for the coordinator's narrative log lines. Defaults
 * to a no-op so the coordinator is silent in tests; production wires
 * it to `logHost` from `@deneb-viz/utils/logging` to preserve the
 * existing dev-overlay narrative the relocated host emissions used to
 * carry.
 */
export type RenderingLifecycleLogger = (
    message: string,
    detail?: unknown
) => void;

/**
 * Structured stream of lifecycle transitions. Each event captures
 * what happened, which id it happened to, and (for failures and
 * safety-net ticks) why. Consumed by:
 *
 *  - The dev overlay added in U11 — pushed into a Zustand slice the
 *    overlay reads, so a developer running with `LOG_LEVEL=0` can
 *    still see lifecycle transitions and the error message attached
 *    to a `renderingFailed` emission. This is the only place
 *    `renderingFailed` error context can surface during certified
 *    builds, since `console.error` is forbidden by Power BI cert
 *    rules and the host's `renderingFailed` reason string is a
 *    write-only sink.
 *  - Unit tests — assertions can read the event sequence directly
 *    rather than inspecting host-emitter calls.
 *
 * The observer is optional. When omitted the coordinator's behavior
 * is identical except no events are delivered (no performance cost
 * paid for an unused sink).
 *
 * `via` discriminators tell the consumer which code path triggered
 * the transition — important for U11's overlay (distinguishing
 * "developer right-clicked away → supersede" from "render genuinely
 * errored" from "safety-net fired") and for test assertions.
 */
export type RenderingLifecycleEvent =
    | {
          kind: 'opened';
          id: RenderingLifecycleId;
          options: powerbi.extensibility.visual.VisualUpdateOptions;
      }
    | { kind: 'render-started'; id: RenderingLifecycleId }
    | {
          kind: 'closed';
          id: RenderingLifecycleId;
          via: 'sync-current' | 'async-pending-render' | 'safety-net';
      }
    | {
          kind: 'failed';
          id: RenderingLifecycleId;
          reason: string;
          error?: unknown;
          via: 'sync-current' | 'async-pending-render' | 'superseded';
      }
    | { kind: 'safety-net-armed'; id: RenderingLifecycleId }
    | {
          kind: 'safety-net-tick';
          id: RenderingLifecycleId;
          result: 'closed' | 'deferred' | 'inert';
      };

export type RenderingLifecycleObserver = (
    event: RenderingLifecycleEvent
) => void;

/**
 * Synthetic reason string passed to `renderingFailed` when an existing
 * open id is displaced by a newer `open()`. Distinct from genuine
 * render errors so future log inspection / metrics can separate
 * "render aborted because superseded" from "render failed because of
 * a real error".
 */
export const SUPERSEDED_FAILURE_REASON = 'superseded';

/**
 * Public surface of the rendering lifecycle coordinator. Owns ALL
 * `host.eventService.rendering*` emission — no other module in the
 * visual is permitted to call `renderingStarted` / `renderingFinished`
 * / `renderingFailed` directly. The async React callbacks route
 * through the `*PendingRender` no-arg variants; synchronous code in
 * `Deneb.update()` and its dispatch handlers use the `*Current`
 * no-arg variants.
 *
 * **Production code MUST type its coordinator reference with this
 * narrower type** — not {@link RenderingLifecycleCoordinatorTestSurface}.
 * The id-bearing variants exist on the runtime object for unit-test
 * determinism but are intentionally absent from this type so the
 * type system rejects production calls that would otherwise produce
 * observer events with a hard-coded (and therefore misleading)
 * `via: 'sync-current'` discriminator regardless of actual context.
 */
export type RenderingLifecycleCoordinator = {
    /**
     * Begin a lifecycle for this update. Emits `renderingStarted` to
     * the host as part of opening — if the host throws on emission,
     * the throw propagates BEFORE the id is recorded in the openIds
     * map, so a follow-up `failCurrent(e)` from `update()`'s catch
     * no-ops cleanly (nothing to fail). If a prior id is still open,
     * it is superseded (closed via `renderingFailed` with the
     * `SUPERSEDED_FAILURE_REASON` marker) before the new id is
     * minted — supersede emission is NOT swallowed; a host throw on
     * the supersede emission propagates out of `open()` and the new
     * id is never minted (truthful-or-loud invariant).
     */
    open: (
        options: powerbi.extensibility.visual.VisualUpdateOptions
    ) => RenderingLifecycleId;
    /**
     * Bind the id whose async render is being awaited. Called
     * synchronously from `src/index.ts` immediately after the
     * dispatch handler commits the dataset / compilation for a
     * rendering update — before `update()` returns. Subsequent
     * `*PendingRender` calls from the React side target this id.
     * Replaces any prior pending-render binding atomically.
     */
    bindPendingRender: (id: RenderingLifecycleId) => void;
    /**
     * No-arg variant of {@link bindPendingRender} that targets
     * whichever id is currently open (per invariant #1, at most one
     * is). Mirrors the {@link closeCurrent} / {@link closePendingRender}
     * shape — production callers inside the visual's dispatch
     * handlers don't have direct access to the opened id (it is
     * minted inside `update()`'s try and captured in a local), so
     * threading it through `resolveUpdateOptions` → `resolveDataset`
     * → each handler would require a chain of optional parameters.
     * The current-open id lookup is identical to what
     * `closeCurrent` performs internally. No-op when nothing is
     * open (e.g. `open()` threw before recording the id).
     */
    bindPendingRenderCurrent: () => void;
    /**
     * Arm the bounded safety-net for an id. If the id is still open
     * (no close / no fail) when the bound elapses, the safety-net
     * checks whether the render ever began: if `renderStarted ===
     * false`, it's an orphan and the safety-net closes it with
     * `renderingFinished`; if `renderStarted === true`, the render is
     * in flight and the safety-net waits (no close emitted). The
     * exactly-once guard inside `close` / `fail` makes the safety-net
     * inert against ids that already closed normally.
     */
    armSafetyNet: (id: RenderingLifecycleId) => void;
    /**
     * Close the currently-open id (used by synchronous code paths
     * inside `update()`'s body — the dispatch handlers' non-rendering
     * returns and the catch-via-fail path). No-op if no id is open or
     * the current id has already closed.
     */
    closeCurrent: () => void;
    /** Fail the currently-open id. Counterpart to `closeCurrent`. */
    failCurrent: (error: unknown) => void;
    /**
     * Close the pending-render id (used by async React callbacks via
     * `app.tsx`'s no-arg adapters). No-op if no pending-render is
     * bound, or the pending-render id has already closed (e.g.
     * superseded by a later `open`).
     */
    closePendingRender: () => void;
    /** Fail the pending-render id. Counterpart to `closePendingRender`. */
    failPendingRender: (error: unknown) => void;
    /**
     * Mark the pending-render id as having started rendering. The
     * host does NOT see a second `renderingStarted`; this flag is
     * internal to the coordinator and is consumed by the safety-net
     * to distinguish orphan vs. in-flight. Idempotent.
     */
    markPendingRenderStarted: () => void;
};

/**
 * Test-only superset of {@link RenderingLifecycleCoordinator} adding
 * id-bearing variants of close / fail / markRenderStarted. These
 * exist so unit-test scenarios can drive deterministic supersede
 * orderings, late-callback races, and safety-net edge cases without
 * round-tripping through `pendingRenderId` / `currentOpenId`. They
 * hard-code their observer event's `via` discriminator to
 * `sync-current`, which is appropriate for the test-determinism use
 * case but would be misleading from any other context. Keeping them
 * off the production {@link RenderingLifecycleCoordinator} type
 * makes that constraint type-enforced rather than convention-enforced.
 *
 * The factory returns this superset; production callers narrow to
 * {@link RenderingLifecycleCoordinator} at the field declaration
 * (`src/index.ts`'s `#coordinator: RenderingLifecycleCoordinator`).
 */
export type RenderingLifecycleCoordinatorTestSurface =
    RenderingLifecycleCoordinator & {
        close: (id: RenderingLifecycleId) => void;
        fail: (id: RenderingLifecycleId, error: unknown) => void;
        markRenderStarted: (id: RenderingLifecycleId) => void;
    };
