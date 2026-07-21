import { describe, expect, it } from 'vitest';
import {
    computeHighlightRanges,
    computeHighlightRangesLowered
} from '../highlight-ranges';

describe('computeHighlightRanges', () => {
    it('returns a single range for a single substring match', () => {
        expect(computeHighlightRanges('Format string', 'format')).toEqual([
            { start: 0, end: 6 }
        ]);
    });

    it('is case-insensitive', () => {
        expect(computeHighlightRanges('Format string', 'FORMAT')).toEqual([
            { start: 0, end: 6 }
        ]);
        expect(computeHighlightRanges('Format string', 'Format')).toEqual([
            { start: 0, end: 6 }
        ]);
    });

    it('returns a range for each non-overlapping match', () => {
        expect(computeHighlightRanges('highlight highlight', 'light')).toEqual([
            { start: 4, end: 9 },
            { start: 14, end: 19 }
        ]);
    });

    it('returns an empty array when there is no match', () => {
        expect(computeHighlightRanges('Format string', 'xyz')).toEqual([]);
    });

    it('returns an empty array when text is empty', () => {
        expect(computeHighlightRanges('', 'format')).toEqual([]);
    });

    it('returns an empty array when query is empty', () => {
        expect(computeHighlightRanges('Format string', '')).toEqual([]);
    });

    it('finds a match at the very end of the string', () => {
        expect(computeHighlightRanges('My query', 'query')).toEqual([
            { start: 3, end: 8 }
        ]);
    });

    it('merges overlapping / adjacent ranges for queries that slide into themselves', () => {
        // query "aa" against "aaaa" — raw `indexOf` loop with non-overlapping
        // steps yields ranges {0,2} and {2,4}, which should merge to {0,4}.
        expect(computeHighlightRanges('aaaa', 'aa')).toEqual([
            { start: 0, end: 4 }
        ]);
    });

    it('merges adjacent ranges for the "aa" against "aaa" case', () => {
        expect(computeHighlightRanges('aaa', 'aa')).toEqual([
            { start: 0, end: 2 }
        ]);
    });

    it('handles special characters without throwing', () => {
        expect(computeHighlightRanges('dataset/columns', '/')).toEqual([
            { start: 7, end: 8 }
        ]);
    });
});

describe('computeHighlightRangesLowered', () => {
    it('returns ranges for an exact (already-lowered) match', () => {
        expect(
            computeHighlightRangesLowered('format string', 'format')
        ).toEqual([{ start: 0, end: 6 }]);
    });

    it('does NOT lowercase its inputs — raw-case inputs miss the match', () => {
        // Caller contract: both inputs MUST already be folded. Passing
        // raw "Format" against already-lowered "format" is a caller bug
        // and returns no match (no implicit folding).
        expect(
            computeHighlightRangesLowered('Format string', 'format')
        ).toEqual([]);
        expect(
            computeHighlightRangesLowered('format string', 'Format')
        ).toEqual([]);
        expect(
            computeHighlightRangesLowered('FORMAT string', 'format')
        ).toEqual([]);
    });

    it('returns a range for each non-overlapping match', () => {
        expect(
            computeHighlightRangesLowered('highlight highlight', 'light')
        ).toEqual([
            { start: 4, end: 9 },
            { start: 14, end: 19 }
        ]);
    });

    it('returns an empty array when either input is empty', () => {
        expect(computeHighlightRangesLowered('', 'format')).toEqual([]);
        expect(computeHighlightRangesLowered('format', '')).toEqual([]);
    });

    it('merges overlapping / adjacent ranges', () => {
        expect(computeHighlightRangesLowered('aaaa', 'aa')).toEqual([
            { start: 0, end: 4 }
        ]);
    });
});
