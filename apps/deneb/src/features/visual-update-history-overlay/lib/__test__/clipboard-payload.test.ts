import { describe, expect, it } from 'vitest';

import { getOverlayClipboardPayload } from '../clipboard-payload';
import { type RenderingLifecycleEvent } from '../../../../lib/rendering-lifecycle';

/**
 * The clipboard payload is a diagnostic capture surface — it must
 * NEVER throw, because a throw in the copy handler breaks the button
 * for exactly the failure event it exists to capture. Lifecycle
 * `failed` events carry an arbitrary `error` value (cycles, BigInt,
 * anything a Vega embed rejection produced), so the builder sanitizes
 * those to strings and falls back to a plain error note if
 * serialization still fails.
 */
describe('getOverlayClipboardPayload', () => {
    const openedEvent = {
        kind: 'opened',
        id: 1,
        options: {
            type: 36,
            viewport: { width: 949, height: 710, scale: 1 },
            editMode: 0,
            viewMode: 1,
            isInFocus: false,
            dataViews: [
                {
                    metadata: {
                        columns: [{ displayName: 'bulky column payload' }],
                        objects: {
                            stateManagement: { viewportHeight: 710 },
                            vega: { jsonSpec: 'HUGE SPEC TEXT' }
                        }
                    }
                }
            ]
        }
    } as unknown as RenderingLifecycleEvent;

    const buildFailedEvent = (error: unknown): RenderingLifecycleEvent =>
        ({
            kind: 'failed',
            id: 2,
            reason: 'boom',
            via: 'async-pending-render',
            error
        }) as unknown as RenderingLifecycleEvent;

    const basePayload = {
        tally: { opens: 1 },
        history: [{ type: 36, viewport: { width: 949, height: 710 } }]
    };

    it('compacts opened events to update-shape essentials, keeping stateManagement and dropping the spec', () => {
        const payload = getOverlayClipboardPayload({
            ...basePayload,
            recentFailures: [],
            lifecycleEvents: [openedEvent]
        });
        expect(payload).toContain('"viewportHeight": 710');
        expect(payload).not.toContain('HUGE SPEC TEXT');
        expect(payload).not.toContain('bulky column payload');
    });

    it('does not throw when a failed event carries a cyclic error value', () => {
        const cyclic: { self?: unknown } = {};
        cyclic.self = cyclic;
        const failed = buildFailedEvent(cyclic);
        const payload = getOverlayClipboardPayload({
            ...basePayload,
            recentFailures: [failed],
            lifecycleEvents: [failed]
        });
        expect(typeof payload).toBe('string');
        expect(payload).toContain('"reason": "boom"');
    });

    it('does not throw when a failed event carries a BigInt error value', () => {
        const failed = buildFailedEvent(BigInt(42));
        const payload = getOverlayClipboardPayload({
            ...basePayload,
            recentFailures: [failed],
            lifecycleEvents: [failed]
        });
        expect(typeof payload).toBe('string');
        expect(payload).toContain('42');
    });

    it('surfaces Error messages readably in the sanitized payload', () => {
        const failed = buildFailedEvent(new Error('view exploded'));
        const payload = getOverlayClipboardPayload({
            ...basePayload,
            recentFailures: [failed],
            lifecycleEvents: [failed]
        });
        expect(payload).toContain('view exploded');
    });

    it('falls back to an error note instead of throwing when serialization fails outright', () => {
        const cyclicTally: { self?: unknown } = {};
        cyclicTally.self = cyclicTally;
        const payload = getOverlayClipboardPayload({
            tally: cyclicTally,
            history: [],
            recentFailures: [],
            lifecycleEvents: []
        });
        expect(typeof payload).toBe('string');
        expect(payload.length).toBeGreaterThan(0);
    });
});
