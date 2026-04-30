import { describe, expect, it } from 'vitest';

import { createStabilityTracker } from '../use-container-stable';

/**
 * Tests for the pure stability tracker that drives `useContainerStable`.
 *
 * Component-tree rendering tests are deferred until `@testing-library/react`
 * lands in this workspace (the same convention as `splitTextIntoSegments`
 * and the rest of the package). The hook itself is a thin React wrapper
 * over `ResizeObserver`, `setTimeout`, and this tracker — so behaviour
 * coverage at the tracker level plus manual verification covers the
 * full surface.
 */

describe('createStabilityTracker', () => {
    it('reports pending after the first observation of a positive width', () => {
        const tracker = createStabilityTracker();

        expect(tracker.observe(640)).toBe('pending');
    });

    it('reports settled after two consecutive observations of the same width', () => {
        const tracker = createStabilityTracker();

        expect(tracker.observe(640)).toBe('pending');
        expect(tracker.observe(640)).toBe('settled');
    });

    it('resets the consecutive-same counter when the width changes', () => {
        const tracker = createStabilityTracker();

        expect(tracker.observe(320)).toBe('pending');
        expect(tracker.observe(640)).toBe('pending');
        expect(tracker.observe(640)).toBe('settled');
    });

    it('treats a width of zero as a non-stable observation', () => {
        const tracker = createStabilityTracker();

        // A detached or zero-sized container should never count as settled,
        // even if reported repeatedly. The host-animation start frequently
        // produces an initial 0×0 measurement.
        expect(tracker.observe(0)).toBe('pending');
        expect(tracker.observe(0)).toBe('pending');
        expect(tracker.observe(0)).toBe('pending');
    });

    it('treats a negative width as a non-stable observation', () => {
        const tracker = createStabilityTracker();

        // Defensive: ResizeObserver should never report a negative width,
        // but if a polyfill or test harness does, we should not settle.
        expect(tracker.observe(-1)).toBe('pending');
        expect(tracker.observe(-1)).toBe('pending');
    });

    it('still settles after a transient zero observation followed by a stable positive width', () => {
        const tracker = createStabilityTracker();

        expect(tracker.observe(0)).toBe('pending');
        expect(tracker.observe(640)).toBe('pending');
        expect(tracker.observe(640)).toBe('settled');
    });

    it('continues reporting settled once the threshold is crossed', () => {
        // Once the tracker has reached a stable state we don't want a single
        // extra callback (e.g. a tail RO event from the host animation
        // ending) to flip it back to pending. Two stable in a row is a
        // monotonic signal.
        const tracker = createStabilityTracker();

        expect(tracker.observe(640)).toBe('pending');
        expect(tracker.observe(640)).toBe('settled');
        expect(tracker.observe(640)).toBe('settled');
        expect(tracker.observe(641)).toBe('pending');
        // After a width change the tracker resumes counting fresh; this is
        // expected because the hook unsubscribes the RO once settled, so a
        // post-settle observation is purely defensive coverage.
    });

    it('handles fractional pixel widths produced by the browser', () => {
        const tracker = createStabilityTracker();

        // Power BI's host scale and DPR can produce non-integer widths.
        expect(tracker.observe(640.5)).toBe('pending');
        expect(tracker.observe(640.5)).toBe('settled');
    });
});
