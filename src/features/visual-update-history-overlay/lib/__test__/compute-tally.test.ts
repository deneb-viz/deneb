import { describe, expect, it } from 'vitest';

import { computeLifecycleTally } from '../compute-tally';
import {
    SUPERSEDED_FAILURE_REASON,
    type RenderingLifecycleEvent,
    type RenderingLifecycleId
} from '../../../../lib/rendering-lifecycle';

const id = (value: number): RenderingLifecycleId =>
    value as RenderingLifecycleId;

const FAKE_OPTIONS = {} as never;

// ─── Happy path & exact counts ───────────────────────────────────────────────

describe('computeLifecycleTally — happy path', () => {
    it('empty event log → zeroed tally with empty pendingIds', () => {
        const tally = computeLifecycleTally([]);
        expect(tally.opens).toBe(0);
        expect(tally.renderStarts).toBe(0);
        expect(tally.closes.total).toBe(0);
        expect(tally.fails.total).toBe(0);
        expect(tally.safetyNet.armed).toBe(0);
        expect(tally.pending).toBe(0);
        expect(tally.pendingIds).toEqual([]);
    });

    it('N opens each with one sync-current close → N starts, N closes, 0 pending', () => {
        const events: RenderingLifecycleEvent[] = [];
        for (let n = 1; n <= 5; n++) {
            events.push({
                kind: 'opened',
                id: id(n),
                options: FAKE_OPTIONS
            });
            events.push({
                kind: 'closed',
                id: id(n),
                via: 'sync-current'
            });
        }
        const tally = computeLifecycleTally(events);
        expect(tally.opens).toBe(5);
        expect(tally.closes.total).toBe(5);
        expect(tally.closes.syncCurrent).toBe(5);
        expect(tally.closes.asyncPendingRender).toBe(0);
        expect(tally.closes.safetyNet).toBe(0);
        expect(tally.pending).toBe(0);
        expect(tally.pendingIds).toEqual([]);
    });

    it('counts close discriminators independently', () => {
        const events: RenderingLifecycleEvent[] = [
            { kind: 'opened', id: id(1), options: FAKE_OPTIONS },
            { kind: 'closed', id: id(1), via: 'sync-current' },
            { kind: 'opened', id: id(2), options: FAKE_OPTIONS },
            { kind: 'closed', id: id(2), via: 'async-pending-render' },
            { kind: 'opened', id: id(3), options: FAKE_OPTIONS },
            { kind: 'closed', id: id(3), via: 'safety-net' }
        ];
        const tally = computeLifecycleTally(events);
        expect(tally.closes).toEqual({
            total: 3,
            syncCurrent: 1,
            asyncPendingRender: 1,
            safetyNet: 1
        });
    });

    it('counts fail discriminators independently', () => {
        const error = new Error('boom');
        const events: RenderingLifecycleEvent[] = [
            { kind: 'opened', id: id(1), options: FAKE_OPTIONS },
            {
                kind: 'failed',
                id: id(1),
                reason: 'boom',
                error,
                via: 'sync-current'
            },
            { kind: 'opened', id: id(2), options: FAKE_OPTIONS },
            {
                kind: 'failed',
                id: id(2),
                reason: 'render error',
                error,
                via: 'async-pending-render'
            },
            { kind: 'opened', id: id(3), options: FAKE_OPTIONS },
            {
                kind: 'failed',
                id: id(3),
                reason: SUPERSEDED_FAILURE_REASON,
                via: 'superseded'
            }
        ];
        const tally = computeLifecycleTally(events);
        expect(tally.fails).toEqual({
            total: 3,
            syncCurrent: 1,
            asyncPendingRender: 1,
            superseded: 1
        });
    });
});

// ─── Pending tracking — the orphan-detection surface ─────────────────────────

describe('computeLifecycleTally — pending ids', () => {
    it('open with no close → 1 pending; pendingIds contains the id', () => {
        const events: RenderingLifecycleEvent[] = [
            { kind: 'opened', id: id(42), options: FAKE_OPTIONS }
        ];
        const tally = computeLifecycleTally(events);
        expect(tally.pending).toBe(1);
        expect(tally.pendingIds).toEqual([42]);
    });

    it('open with no close, then safety-net closes it → 0 pending', () => {
        const events: RenderingLifecycleEvent[] = [
            { kind: 'opened', id: id(42), options: FAKE_OPTIONS },
            { kind: 'safety-net-armed', id: id(42) },
            { kind: 'safety-net-tick', id: id(42), result: 'closed' },
            { kind: 'closed', id: id(42), via: 'safety-net' }
        ];
        const tally = computeLifecycleTally(events);
        expect(tally.pending).toBe(0);
        expect(tally.pendingIds).toEqual([]);
        expect(tally.safetyNet.armed).toBe(1);
        expect(tally.safetyNet.closedByTick).toBe(1);
        expect(tally.closes.safetyNet).toBe(1);
    });

    it('multiple opens with mixed terminals → pending equals open-minus-closed-minus-failed', () => {
        const events: RenderingLifecycleEvent[] = [
            { kind: 'opened', id: id(1), options: FAKE_OPTIONS },
            { kind: 'closed', id: id(1), via: 'sync-current' },
            { kind: 'opened', id: id(2), options: FAKE_OPTIONS },
            // id=2 superseded by id=3 below
            { kind: 'opened', id: id(3), options: FAKE_OPTIONS },
            {
                kind: 'failed',
                id: id(2),
                reason: 'superseded',
                via: 'superseded'
            },
            { kind: 'opened', id: id(4), options: FAKE_OPTIONS }
            // ids 3 and 4 are still pending
        ];
        const tally = computeLifecycleTally(events);
        expect(tally.pending).toBe(2);
        expect(tally.pendingIds).toEqual([3, 4]);
    });

    it('pendingIds is sorted numerically (not lexicographically)', () => {
        const events: RenderingLifecycleEvent[] = [
            { kind: 'opened', id: id(9), options: FAKE_OPTIONS },
            { kind: 'opened', id: id(11), options: FAKE_OPTIONS },
            { kind: 'opened', id: id(2), options: FAKE_OPTIONS }
        ];
        const tally = computeLifecycleTally(events);
        expect(tally.pendingIds).toEqual([2, 9, 11]);
    });
});

// ─── Exactly-once / stale-event resilience ───────────────────────────────────

describe('computeLifecycleTally — resilience to stale events', () => {
    it('a stale double-close attempt does not double-count closes', () => {
        // The coordinator's exactly-once guard means a second
        // close(id) call no-ops and does NOT emit a second `closed`
        // observer event. But if the slice's ring somehow contained
        // a duplicate event, the tally should still produce the
        // correct count by treating the second close on an already-
        // closed id as a no-op for pending tracking.
        const events: RenderingLifecycleEvent[] = [
            { kind: 'opened', id: id(1), options: FAKE_OPTIONS },
            { kind: 'closed', id: id(1), via: 'sync-current' },
            // Stale duplicate — the tally counts both close events
            // (because the discriminator counts are raw counts of
            // observed events) but `pending` stays at 0.
            { kind: 'closed', id: id(1), via: 'sync-current' }
        ];
        const tally = computeLifecycleTally(events);
        expect(tally.closes.total).toBe(2);
        expect(tally.pending).toBe(0);
        expect(tally.pendingIds).toEqual([]);
    });

    it('counts safety-net-tick results separately from closes', () => {
        // A tick with result `closed` increments `safetyNet.closedByTick`
        // AND emits a separate `closed` event with `via: 'safety-net'`
        // that increments `closes.safetyNet`. The tally surfaces
        // both — `closedByTick` is the safety-net's perspective,
        // `closes.safetyNet` is the close surface's perspective.
        // A tick with result `inert` is observed but does NOT emit a
        // separate `closed` event.
        const events: RenderingLifecycleEvent[] = [
            { kind: 'opened', id: id(1), options: FAKE_OPTIONS },
            { kind: 'safety-net-armed', id: id(1) },
            { kind: 'safety-net-tick', id: id(1), result: 'inert' },
            { kind: 'safety-net-tick', id: id(1), result: 'closed' },
            { kind: 'closed', id: id(1), via: 'safety-net' }
        ];
        const tally = computeLifecycleTally(events);
        expect(tally.safetyNet.inert).toBe(1);
        expect(tally.safetyNet.closedByTick).toBe(1);
        expect(tally.closes.safetyNet).toBe(1);
        expect(tally.closes.total).toBe(1);
    });
});

// ─── End-to-end scenario the U7-U10 chain produces in production ─────────────

describe('computeLifecycleTally — end-to-end scenarios', () => {
    it('U8 skip update + U9 render update + U10 incremental update → all three close discriminators populated', () => {
        const events: RenderingLifecycleEvent[] = [
            // U9: full re-embed (reload)
            { kind: 'opened', id: id(1), options: FAKE_OPTIONS },
            { kind: 'safety-net-armed', id: id(1) },
            { kind: 'render-started', id: id(1) },
            { kind: 'closed', id: id(1), via: 'async-pending-render' },
            // U8: skip path (resize)
            { kind: 'opened', id: id(2), options: FAKE_OPTIONS },
            { kind: 'safety-net-armed', id: id(2) },
            { kind: 'closed', id: id(2), via: 'sync-current' },
            // U10: incremental update
            { kind: 'opened', id: id(3), options: FAKE_OPTIONS },
            { kind: 'safety-net-armed', id: id(3) },
            { kind: 'closed', id: id(3), via: 'async-pending-render' }
        ];
        const tally = computeLifecycleTally(events);
        expect(tally.opens).toBe(3);
        expect(tally.closes.total).toBe(3);
        expect(tally.closes.syncCurrent).toBe(1);
        expect(tally.closes.asyncPendingRender).toBe(2);
        expect(tally.safetyNet.armed).toBe(3);
        expect(tally.pending).toBe(0);
    });

    it('coalesced updates: open(A), open(B) supersedes A, B closes → 1 fail-superseded + 1 close', () => {
        const events: RenderingLifecycleEvent[] = [
            { kind: 'opened', id: id(1), options: FAKE_OPTIONS },
            { kind: 'safety-net-armed', id: id(1) },
            {
                kind: 'failed',
                id: id(1),
                reason: SUPERSEDED_FAILURE_REASON,
                via: 'superseded'
            },
            { kind: 'opened', id: id(2), options: FAKE_OPTIONS },
            { kind: 'safety-net-armed', id: id(2) },
            { kind: 'closed', id: id(2), via: 'async-pending-render' }
        ];
        const tally = computeLifecycleTally(events);
        expect(tally.opens).toBe(2);
        expect(tally.fails.superseded).toBe(1);
        expect(tally.closes.asyncPendingRender).toBe(1);
        expect(tally.pending).toBe(0);
    });
});
