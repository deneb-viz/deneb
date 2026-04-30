import { describe, expect, it } from 'vitest';

import { computeRetentionState } from '../retained-deneb-editor-state';

/**
 * Tests for the pure retention-state helper that drives
 * `<RetainedDenebEditor>`.
 *
 * The helper answers two questions per render:
 *   - shouldRender: should the editor subtree be in the DOM at all?
 *   - isVisible:    should it be `display: flex` or `display: none`?
 *   - nextHasOpenedOnce: the new value of the latch state
 *
 * The latch is sticky: once `hasOpenedOnce` flips to true on the first
 * editor mode it stays true for the lifetime of the visual instance. The
 * editor never unmounts after the first open, so subsequent
 * viewer↔editor toggles are a CSS visibility flip, not a remount.
 */

describe('computeRetentionState', () => {
    it('does not render anything before the first editor open', () => {
        // Initial visual lifetime: user hasn't entered editor yet.
        expect(computeRetentionState(false, false)).toEqual({
            shouldRender: false,
            isVisible: false,
            nextHasOpenedOnce: false
        });
    });

    it('flips the latch and renders when the user first opens the editor', () => {
        expect(computeRetentionState(false, true)).toEqual({
            shouldRender: true,
            isVisible: true,
            nextHasOpenedOnce: true
        });
    });

    it('keeps the editor mounted but hidden when the user goes back to viewer after opening', () => {
        expect(computeRetentionState(true, false)).toEqual({
            shouldRender: true,
            isVisible: false,
            nextHasOpenedOnce: true
        });
    });

    it('shows the retained editor when the user reopens it', () => {
        expect(computeRetentionState(true, true)).toEqual({
            shouldRender: true,
            isVisible: true,
            nextHasOpenedOnce: true
        });
    });

    it('preserves the latch through transition modes (rendered hidden)', () => {
        // App.tsx already routes transition-* modes to a non-editor branch
        // for the foreground component. The retained editor sits separately
        // and stays mounted-but-hidden through transitions, ready to
        // become visible the moment the host settles back into 'editor'.
        expect(computeRetentionState(true, false)).toEqual({
            shouldRender: true,
            isVisible: false,
            nextHasOpenedOnce: true
        });
    });

    it('never resets the latch even if the caller passes false for hasOpenedOnce when isEditorMode is false', () => {
        // Defensive: the wrapper is sticky. Even if a caller forgets to
        // persist the latch (e.g. unmounts the parent), the helper itself
        // does not invent a `true` from nothing — that requires
        // `isEditorMode === true` to flip.
        expect(computeRetentionState(false, false).nextHasOpenedOnce).toBe(
            false
        );
    });

    it('does not unset the latch when isEditorMode goes false on a previously-opened session', () => {
        // The user opened the editor at least once, then went back to
        // viewer or any other non-editor mode. The latch must remain
        // true so we do not unmount the editor.
        expect(computeRetentionState(true, false).nextHasOpenedOnce).toBe(true);
    });
});
