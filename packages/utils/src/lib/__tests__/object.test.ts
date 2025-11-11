import { describe, expect, it } from 'vitest';
import { pickBy } from '../object';

describe('pickBy', () => {
    it('should pick properties that satisfy the predicate', () => {
        const obj = {
            a: 1,
            b: 2,
            c: 3,
            d: 4
        };
        const predicate = (value: number) => value % 2 === 0;
        const result = pickBy(obj, predicate);
        expect(result).toEqual({
            b: 2,
            d: 4
        });
    });
    it('should handle empty objects', () => {
        const obj = {};
        const predicate = (value: number) => value % 2 === 0;
        const result = pickBy(obj, predicate);
        expect(result).toEqual({});
    });
    it('should handle objects with no properties satisfying the predicate', () => {
        const obj = {
            a: 1,
            b: 3,
            c: 5
        };
        const predicate = (value: number) => value % 2 === 0;
        const result = pickBy(obj, predicate);
        expect(result).toEqual({});
    });
});
