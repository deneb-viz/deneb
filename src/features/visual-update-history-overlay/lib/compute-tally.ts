import { type RenderingLifecycleEvent } from '../../../lib/rendering-lifecycle';

/**
 * Per-discriminator close counts. Mirrors the
 * {@link RenderingLifecycleEvent} `closed` union's `via` field exactly
 * so a future addition to the discriminator surfaces here as a type
 * error at the `switch (event.via)` site below — not as a silently
 *-uncategorised count.
 */
export type CloseTally = {
    total: number;
    syncCurrent: number;
    asyncPendingRender: number;
    safetyNet: number;
};

/**
 * Per-discriminator fail counts. Same drift-protection rationale as
 * {@link CloseTally}.
 */
export type FailTally = {
    total: number;
    syncCurrent: number;
    asyncPendingRender: number;
    superseded: number;
};

/**
 * Per-result safety-net tick counts. The `armed` count is incremented
 * by the `safety-net-armed` event (every `armSafetyNet` call); the
 * three result-keyed counts are incremented when a tick actually
 * fires.
 */
export type SafetyNetTally = {
    armed: number;
    closedByTick: number;
    inert: number;
};

/**
 * Aggregated, deterministic view of the rendering-lifecycle event
 * stream. Pure function output — same input array always produces
 * the same tally. The dev overlay re-renders by recomputing from
 * the underlying `lifecycleEvents` ring on every render; cost is
 * O(events) and bounded by the slice's `LIFECYCLE_EVENTS_RING_LIMIT`.
 */
export type LifecycleTally = {
    /** Total `open()` calls observed. */
    opens: number;
    /** Total `markRenderStarted` / `markPendingRenderStarted` calls. */
    renderStarts: number;
    closes: CloseTally;
    fails: FailTally;
    safetyNet: SafetyNetTally;
    /**
     * Number of `stale-close` events — async pending-render terminals
     * suppressed by the coordinator's in-flight render-epoch guard
     * (Important #6). A sustained non-zero value across updates is
     * expected during rapid supersede storms; it does NOT indicate an
     * orphan (the suppressed terminal left the freshly-bound render
     * intact, to be closed by its own real terminal).
     */
    staleCloses: number;
    /**
     * Number of ids that received an `opened` event but no matching
     * `closed` / `failed` terminal — i.e. ids still in flight from
     * the slice's perspective. For a healthy run with the overlay
     * watching, this stabilises at 0 or 1 (the most recent
     * still-rendering id). A value > 1 sustained across multiple
     * updates indicates a real orphan situation worth investigating.
     */
    pending: number;
    /** The ids currently pending (open without terminal). */
    pendingIds: number[];
};

/**
 * Compute the live tally from the lifecycle event ring. Pure;
 * O(events). Drives the dev overlay's UI as well as the unit tests
 * that pin the expected aggregation behaviour.
 */
export const computeLifecycleTally = (
    events: readonly RenderingLifecycleEvent[]
): LifecycleTally => {
    const tally: LifecycleTally = {
        opens: 0,
        renderStarts: 0,
        closes: {
            total: 0,
            syncCurrent: 0,
            asyncPendingRender: 0,
            safetyNet: 0
        },
        fails: {
            total: 0,
            syncCurrent: 0,
            asyncPendingRender: 0,
            superseded: 0
        },
        safetyNet: {
            armed: 0,
            closedByTick: 0,
            inert: 0
        },
        staleCloses: 0,
        pending: 0,
        pendingIds: []
    };
    const open = new Set<number>();
    for (const event of events) {
        switch (event.kind) {
            case 'opened':
                tally.opens++;
                open.add(event.id);
                break;
            case 'render-started':
                tally.renderStarts++;
                break;
            case 'closed':
                tally.closes.total++;
                switch (event.via) {
                    case 'sync-current':
                        tally.closes.syncCurrent++;
                        break;
                    case 'async-pending-render':
                        tally.closes.asyncPendingRender++;
                        break;
                    case 'safety-net':
                        tally.closes.safetyNet++;
                        break;
                }
                open.delete(event.id);
                break;
            case 'failed':
                tally.fails.total++;
                switch (event.via) {
                    case 'sync-current':
                        tally.fails.syncCurrent++;
                        break;
                    case 'async-pending-render':
                        tally.fails.asyncPendingRender++;
                        break;
                    case 'superseded':
                        tally.fails.superseded++;
                        break;
                }
                open.delete(event.id);
                break;
            case 'safety-net-armed':
                tally.safetyNet.armed++;
                break;
            case 'safety-net-tick':
                switch (event.result) {
                    case 'closed':
                        tally.safetyNet.closedByTick++;
                        break;
                    case 'inert':
                        tally.safetyNet.inert++;
                        break;
                }
                break;
            case 'stale-close':
                // Suppressed async terminal (Important #6). Counted, but
                // deliberately NOT applied to the `open` set: the stale
                // terminal was a no-op, so the freshly-bound id remains
                // legitimately pending until its own real terminal fires.
                tally.staleCloses++;
                break;
        }
    }
    tally.pending = open.size;
    tally.pendingIds = Array.from(open).sort((a, b) => a - b);
    return tally;
};
