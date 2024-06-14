import { merge, pickBy } from '../object';

describe('merge', () => {
    it('should deep clone an object', () => {
        const obj = {
            a: 1,
            b: {
                c: 2,
                d: {
                    e: 3
                }
            }
        };
        const result = merge(obj);
        expect(result).toEqual(obj);
        expect(result).not.toBe(obj);
        expect(result.b).not.toBe(obj.b);
        expect(result.b.d).not.toBe(obj.b.d);
    });

    it('should merge multiple objects', () => {
        const target = {
            a: 1,
            b: {
                c: 2
            }
        };
        const source1 = {
            b: {
                d: 3
            }
        };
        const source2 = {
            e: 4
        };
        const result = merge(target, source1, source2);
        expect(result).toEqual({
            a: 1,
            b: {
                c: 2,
                d: 3
            },
            e: 4
        });
    });

    it('should handle empty objects', () => {
        const target = {};
        const source1 = {};
        const source2 = {};
        const result = merge(target, source1, source2);
        expect(result).toEqual({});
    });
});

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
