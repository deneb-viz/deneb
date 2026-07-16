import { describe, expect, it } from 'vitest';
import { getRowNumbersFromData } from '../data-point';

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
