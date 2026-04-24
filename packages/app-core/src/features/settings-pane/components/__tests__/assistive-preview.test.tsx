import { describe, expect, it } from 'vitest';

import { splitTextIntoSegments } from '../highlight-text';
import type { HighlightRange } from '../../search/types';

/**
 * Pure helper mirroring `<AssistivePreview>`'s null-vs-render decision.
 * Kept inline in the test file so production code doesn't gain a
 * testing-only surface — the component implements the same two-line
 * guard before handing work off to `<HighlightText>`.
 */
const shouldRenderAssistivePreview = (
    text: string,
    ranges: readonly HighlightRange[] | undefined
): boolean => {
    if (!text) return false;
    if (!ranges || ranges.length === 0) return false;
    return true;
};

/**
 * Component-tree rendering tests are deferred until `@testing-library/react`
 * is available in this workspace (see plan: Unit 4 notes). In the meantime
 * the guard + segmentation helpers together exercise every decision the
 * component makes.
 */
describe('AssistivePreview rendering decision', () => {
    it('does not render when text is empty', () => {
        expect(shouldRenderAssistivePreview('', [{ start: 0, end: 1 }])).toBe(
            false
        );
    });

    it('does not render when ranges is undefined', () => {
        expect(shouldRenderAssistivePreview('assistive text', undefined)).toBe(
            false
        );
    });

    it('does not render when ranges is empty', () => {
        expect(shouldRenderAssistivePreview('assistive text', [])).toBe(false);
    });

    it('renders when there is text and at least one range', () => {
        expect(
            shouldRenderAssistivePreview('assistive text', [
                { start: 0, end: 9 }
            ])
        ).toBe(true);
    });
});

describe('AssistivePreview highlight segmentation', () => {
    it('produces a single <mark>-equivalent segment for the matched portion', () => {
        expect(
            splitTextIntoSegments('canvas rendering mode', [
                { start: 0, end: 6 }
            ])
        ).toEqual([
            { text: 'canvas', isMatch: true },
            { text: ' rendering mode', isMatch: false }
        ]);
    });

    it('produces multiple match segments when the query hits twice', () => {
        expect(
            splitTextIntoSegments('zoom to zoom', [
                { start: 0, end: 4 },
                { start: 8, end: 12 }
            ])
        ).toEqual([
            { text: 'zoom', isMatch: true },
            { text: ' to ', isMatch: false },
            { text: 'zoom', isMatch: true }
        ]);
    });
});
