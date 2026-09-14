import { describe, expect, it } from 'vitest';
import { getResolvedRowIdentities, getRowNumbersFromData } from '../data-point';

const ROW = '__row__';

describe('getRowNumbersFromData', () => {
    const data = [
        { [ROW]: 0 },
        { [ROW]: 2 },
        { [ROW]: 2 }, // duplicate — must still dedupe
        { [ROW]: -1 }, // invalid: negative
        { [ROW]: 1.5 }, // invalid: non-integer
        { [ROW]: '3' }, // invalid: non-number
        { [ROW]: 99 } // invalid: out of range for length 5
    ];
    it('without datasetLength, keeps legacy behavior (defined values pass)', () => {
        expect(getRowNumbersFromData(data)).toEqual([0, 2, -1, 1.5, '3', 99]);
    });
    it('with datasetLength, skips invalid indices and dedupes', () => {
        expect(getRowNumbersFromData(data, 5)).toEqual([0, 2]);
    });
    it('with datasetLength 0, returns empty', () => {
        expect(getRowNumbersFromData([{ [ROW]: 0 }], 0)).toEqual([]);
    });
});

describe('getResolvedRowIdentities', () => {
    const dataset = {
        fields: {},
        values: [{ [ROW]: 0 }, { [ROW]: 1 }, { [ROW]: 2 }]
    } as never;
    it('single datum with valid __row__ returns it', () => {
        expect(getResolvedRowIdentities([{ [ROW]: 1 }], dataset)).toEqual([1]);
    });
    it.each([
        ['out of range', 99],
        ['negative', -1],
        ['non-integer', 1.5],
        ['non-number', '1'],
        ['NaN', NaN]
    ])('single datum with %s __row__ never surfaces it', (_label, bad) => {
        const result = getResolvedRowIdentities([{ [ROW]: bad }], dataset);
        // With the fixture's empty `fields`, field-matching matches all rows,
        // hitting the "all rows selected -> clear" path. NaN can't be checked
        // via `not.toContain` (NaN !== NaN), so pin the actual result instead.
        expect(result).toEqual([]);
    });
    it('single datum with invalid __row__ resolves the right row via field matching', () => {
        // Unlike the empty-fields fixture above (which matches all rows and
        // exercises the clear path), a real field must match only its own row.
        const fieldedDataset = {
            fields: { category: {} },
            values: [
                { category: 'A', [ROW]: 0 },
                { category: 'B', [ROW]: 1 },
                { category: 'C', [ROW]: 2 }
            ]
        } as never;
        const result = getResolvedRowIdentities(
            [{ category: 'B', [ROW]: 99 }],
            fieldedDataset
        );
        expect(result).toEqual([1]);
    });
    it('multi-datum keeps only valid indices', () => {
        const result = getResolvedRowIdentities(
            [{ [ROW]: 0 }, { [ROW]: 99 }],
            dataset
        );
        expect(result).toEqual([0]);
    });
});
