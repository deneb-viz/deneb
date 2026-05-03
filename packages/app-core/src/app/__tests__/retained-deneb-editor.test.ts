import { describe, expect, it } from 'vitest';

import { computeRetentionState } from '../retained-deneb-editor-state';

/**
 * Tests for the pure retention-state helper that drives
 * `<RetainedDenebEditor>`.
 *
 * The helper answers two questions per render:
 *   - shouldRender: should the editor subtree be in the DOM at all?
 *   - isVisible:    should it be `display: flex` or `display: none`?
 *
 * The latch is sticky in the calling component: once `hasOpenedOnce`
 * flips to true on the first editor mode it stays true for the
 * lifetime of the visual instance. The editor never unmounts after
 * the first open, so subsequent viewer↔editor toggles are a CSS
 * visibility flip, not a remount.
 */

describe('computeRetentionState', () => {
    it('does not render anything before the first editor open', () => {
        expect(computeRetentionState(false, false)).toEqual({
            shouldRender: false,
            isVisible: false
        });
    });

    it('renders and shows the editor on first open', () => {
        expect(computeRetentionState(false, true)).toEqual({
            shouldRender: true,
            isVisible: true
        });
    });

    it('keeps the editor mounted but hidden when the user goes back to viewer after opening', () => {
        expect(computeRetentionState(true, false)).toEqual({
            shouldRender: true,
            isVisible: false
        });
    });

    it('shows the retained editor when the user reopens it', () => {
        expect(computeRetentionState(true, true)).toEqual({
            shouldRender: true,
            isVisible: true
        });
    });
});
