import { describe, it, expect } from 'vitest';

import { getPageSlice } from '../data-table-pagination';

const seq = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

describe('getPageSlice', () => {
    it('returns the first page', () => {
        expect(getPageSlice(seq(10), 1, 4)).toEqual([0, 1, 2, 3]);
    });

    it('returns a middle page', () => {
        expect(getPageSlice(seq(10), 2, 4)).toEqual([4, 5, 6, 7]);
    });

    it('returns a partial last page', () => {
        expect(getPageSlice(seq(10), 3, 4)).toEqual([8, 9]);
    });

    it('clamps a page beyond the range to the last page', () => {
        expect(getPageSlice(seq(10), 99, 4)).toEqual([8, 9]);
    });

    it('clamps a page below 1 to the first page', () => {
        expect(getPageSlice(seq(10), 0, 4)).toEqual([0, 1, 2, 3]);
        expect(getPageSlice(seq(10), -5, 4)).toEqual([0, 1, 2, 3]);
    });

    it('returns an empty array when perPage is zero or negative', () => {
        expect(getPageSlice(seq(10), 1, 0)).toEqual([]);
        expect(getPageSlice(seq(10), 1, -3)).toEqual([]);
    });

    it('returns an empty array for empty input', () => {
        expect(getPageSlice([], 1, 10)).toEqual([]);
    });

    it('returns all rows when perPage exceeds the row count', () => {
        expect(getPageSlice(seq(3), 1, 50)).toEqual([0, 1, 2]);
    });

    it('does not mutate the input array', () => {
        const input = seq(6);
        getPageSlice(input, 2, 2);
        expect(input).toEqual(seq(6));
    });
});
