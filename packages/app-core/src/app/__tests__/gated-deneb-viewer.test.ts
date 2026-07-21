import { describe, expect, it } from 'vitest';

import { computeViewerGateEngage } from '../gated-deneb-viewer';

/**
 * Tests for the pure engage-decision helper that drives
 * `<GatedDenebViewer>`'s gate engagement on viewer-mode edges.
 *
 * The helper answers one question per render-edge:
 *   should the per-toggle viewport-match gate engage now?
 *
 * Three predicates combine:
 *   1. The viewer-mode flag must have flipped this render.
 *   2. The flip must be into viewer mode (false → true).
 *   3. The user must have opened the editor at least once in the
 *      session — otherwise there is no host-paced shrink to wait
 *      for and the cold-load fast path applies.
 *
 * The disengage direction (viewer → not-viewer) is handled inline by
 * the component and is not part of this helper's contract.
 */
describe('computeViewerGateEngage', () => {
    it('does not engage on cold load before any editor open', () => {
        // First-ever viewer mount, latch unset — fast path, no gate.
        expect(computeViewerGateEngage(false, true, false)).toBe(false);
    });

    it('engages on the false→true viewer-mode edge after an editor session', () => {
        // The protected case: user has opened the editor, returned
        // to viewer, and the gate must hold the children back until
        // the iframe finishes shrinking.
        expect(computeViewerGateEngage(false, true, true)).toBe(true);
    });

    it('does not engage on the true→false viewer-mode edge', () => {
        // Leaving viewer mode is the disengage direction; the helper
        // returns false here so the caller can take the explicit
        // disengage branch instead.
        expect(computeViewerGateEngage(true, false, true)).toBe(false);
    });

    it('does not engage when the viewer-mode flag has not changed', () => {
        // No edge — same render value on both sides. The component
        // only consults the helper on actual edges, but the helper
        // is robust to non-edge calls.
        expect(computeViewerGateEngage(true, true, true)).toBe(false);
        expect(computeViewerGateEngage(false, false, true)).toBe(false);
    });
});
