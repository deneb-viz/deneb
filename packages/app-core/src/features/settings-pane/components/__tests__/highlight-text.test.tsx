import { describe, expect, it } from 'vitest';

import { splitTextIntoSegments } from '../highlight-text';

/**
 * Component-tree rendering tests are deferred until `@testing-library/react`
 * lands in this workspace (see plan: Unit 4 notes). In the meantime we
 * cover the pure segmentation helper that drives every output decision
 * inside `<HighlightText>`.
 */
describe('splitTextIntoSegments', () => {
    it('returns an empty array for empty text', () => {
        expect(splitTextIntoSegments('', undefined)).toEqual([]);
        expect(splitTextIntoSegments('', [{ start: 0, end: 0 }])).toEqual([]);
    });

    it('returns a single non-match segment when ranges is undefined', () => {
        expect(splitTextIntoSegments('Format string', undefined)).toEqual([
            { text: 'Format string', isMatch: false }
        ]);
    });

    it('returns a single non-match segment when ranges is empty', () => {
        expect(splitTextIntoSegments('Format string', [])).toEqual([
            { text: 'Format string', isMatch: false }
        ]);
    });

    it('splits a single match at the start of the string', () => {
        expect(
            splitTextIntoSegments('Format string', [{ start: 0, end: 6 }])
        ).toEqual([
            { text: 'Format', isMatch: true },
            { text: ' string', isMatch: false }
        ]);
    });

    it('splits a single match in the middle of the string', () => {
        expect(
            splitTextIntoSegments('abc MATCH def', [{ start: 4, end: 9 }])
        ).toEqual([
            { text: 'abc ', isMatch: false },
            { text: 'MATCH', isMatch: true },
            { text: ' def', isMatch: false }
        ]);
    });

    it('splits a single match at the end of the string', () => {
        expect(
            splitTextIntoSegments('my query', [{ start: 3, end: 8 }])
        ).toEqual([
            { text: 'my ', isMatch: false },
            { text: 'query', isMatch: true }
        ]);
    });

    it('emits alternating segments for multiple matches', () => {
        expect(
            splitTextIntoSegments('abcabc', [
                { start: 0, end: 1 },
                { start: 3, end: 4 }
            ])
        ).toEqual([
            { text: 'a', isMatch: true },
            { text: 'bc', isMatch: false },
            { text: 'a', isMatch: true },
            { text: 'bc', isMatch: false }
        ]);
    });

    it('emits contiguous match segments when two ranges abut', () => {
        expect(
            splitTextIntoSegments('abcdef', [
                { start: 0, end: 2 },
                { start: 2, end: 4 }
            ])
        ).toEqual([
            { text: 'ab', isMatch: true },
            { text: 'cd', isMatch: true },
            { text: 'ef', isMatch: false }
        ]);
    });

    it('clamps ranges that extend past the text length', () => {
        expect(splitTextIntoSegments('abc', [{ start: 1, end: 99 }])).toEqual([
            { text: 'a', isMatch: false },
            { text: 'bc', isMatch: true }
        ]);
    });

    it('skips zero-width and inverted ranges', () => {
        expect(
            splitTextIntoSegments('abcdef', [
                { start: 2, end: 2 },
                { start: 5, end: 4 },
                { start: 3, end: 5 }
            ])
        ).toEqual([
            { text: 'abc', isMatch: false },
            { text: 'de', isMatch: true },
            { text: 'f', isMatch: false }
        ]);
    });
});
