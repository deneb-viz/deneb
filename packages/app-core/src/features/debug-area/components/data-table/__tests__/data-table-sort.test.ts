import { describe, it, expect } from 'vitest';

import { sortRows } from '../data-table-sort';
import type { DataTableViewerColumn } from '../data-table-viewer-types';

type Row = { id: string; v: unknown };

const col = (selector: (r: Row) => unknown): DataTableViewerColumn<Row> => ({
    id: 'v',
    name: 'v',
    selector,
    cell: () => null
});

const bySelector = col((r) => r.v);

const rows = (...vs: unknown[]): Row[] =>
    vs.map((v, i) => ({ id: `r${i}`, v }));

describe('sortRows', () => {
    it('sorts numbers numerically, not lexicographically', () => {
        const result = sortRows(rows(10, 2, 1, 100), bySelector, true);
        expect(result.map((r) => r.v)).toEqual([1, 2, 10, 100]);
    });

    it('sorts numbers descending', () => {
        const result = sortRows(rows(10, 2, 1, 100), bySelector, false);
        expect(result.map((r) => r.v)).toEqual([100, 10, 2, 1]);
    });

    it('sorts strings via localeCompare (case-insensitive-ish ordering)', () => {
        const result = sortRows(rows('banana', 'apple', 'cherry'), bySelector, true);
        expect(result.map((r) => r.v)).toEqual(['apple', 'banana', 'cherry']);
    });

    it('sorts dates chronologically', () => {
        const d1 = new Date('2020-01-01');
        const d2 = new Date('2021-06-15');
        const d3 = new Date('2019-12-31');
        const result = sortRows(rows(d1, d2, d3), bySelector, true);
        expect(result.map((r) => r.v)).toEqual([d3, d1, d2]);
    });

    it('places null and undefined last on ascending sort', () => {
        const result = sortRows(rows(3, null, 1, undefined, 2), bySelector, true);
        expect(result.map((r) => r.v)).toEqual([1, 2, 3, null, undefined]);
    });

    it('places null and undefined last on descending sort too', () => {
        const result = sortRows(rows(3, null, 1, undefined, 2), bySelector, false);
        // nulls stay last regardless of direction
        expect(result.slice(0, 3).map((r) => r.v)).toEqual([3, 2, 1]);
        expect(result.slice(3).map((r) => r.v)).toEqual([null, undefined]);
    });

    it('is stable for ties (equal keys retain original order)', () => {
        const input: Row[] = [
            { id: 'a', v: 1 },
            { id: 'b', v: 1 },
            { id: 'c', v: 1 },
            { id: 'd', v: 0 }
        ];
        const result = sortRows(input, bySelector, true);
        expect(result.map((r) => r.id)).toEqual(['d', 'a', 'b', 'c']);
    });

    it('returns an empty array unchanged', () => {
        expect(sortRows([], bySelector, true)).toEqual([]);
    });

    it('returns rows unchanged (copy) when no column is supplied', () => {
        const input = rows(3, 1, 2);
        const result = sortRows(input, null, true);
        expect(result.map((r) => r.v)).toEqual([3, 1, 2]);
        expect(result).not.toBe(input);
    });

    it('does not mutate the input array', () => {
        const input = rows(3, 1, 2);
        sortRows(input, bySelector, true);
        expect(input.map((r) => r.v)).toEqual([3, 1, 2]);
    });

    it('treats NaN like a nil value (sorted last)', () => {
        const result = sortRows(rows(2, NaN, 1), bySelector, true);
        expect(result.slice(0, 2).map((r) => r.v)).toEqual([1, 2]);
        expect(Number.isNaN(result[2].v)).toBe(true);
    });
});
