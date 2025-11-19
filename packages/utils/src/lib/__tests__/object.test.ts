import { describe, expect, it } from 'vitest';
import { omit, pickBy, updateDeep } from '../object';

describe('omit', () => {
    it('should omit specified keys from an object', () => {
        const obj = {
            a: 1,
            b: 2,
            c: 3,
            d: 4
        };
        const result = omit(obj, ['b', 'd']);
        expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should handle empty omit list', () => {
        const obj = { a: 1, b: 2 };
        const result = omit(obj, []);
        expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle omitting all keys', () => {
        const obj = { a: 1, b: 2 };
        const result = omit(obj, ['a', 'b']);
        expect(result).toEqual({});
    });

    it('should handle non-existent keys', () => {
        const obj = { a: 1, b: 2 };
        const result = omit(obj, ['c', 'd']);
        expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle null input', () => {
        const result = omit(null as any, ['a', 'b']);
        expect(result).toEqual({});
    });

    it('should handle undefined input', () => {
        const result = omit(undefined as any, ['a', 'b']);
        expect(result).toEqual({});
    });

    it('should not mutate the original object', () => {
        const obj = { a: 1, b: 2, c: 3 };
        const result = omit(obj, ['b']);
        expect(result).toEqual({ a: 1, c: 3 });
        expect(obj).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should handle mixed value types', () => {
        const obj = {
            str: 'hello',
            num: 42,
            bool: true,
            arr: [1, 2, 3],
            obj: { nested: 'value' }
        };
        const result = omit(obj, ['num', 'bool']);
        expect(result).toEqual({
            str: 'hello',
            arr: [1, 2, 3],
            obj: { nested: 'value' }
        });
    });

    it('should only omit own properties', () => {
        const proto = { inherited: 'value' };
        const obj = Object.create(proto);
        obj.own = 'property';
        const result = omit(obj, ['inherited']);
        expect(result).toEqual({ own: 'property' });
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

    describe('updateDeep', () => {
        it('should update a nested value', () => {
            const obj = { a: { b: { c: 1 } } };
            const updated = updateDeep(obj, ['a', 'b', 'c'], 99);
            expect(updated).toEqual({ a: { b: { c: 99 } } });
            expect(obj.a.b.c).toBe(1); // original object not mutated
        });

        it('should add a new nested value', () => {
            const obj = { a: {} };
            const updated = updateDeep(obj, ['a', 'x', 'y'], 5);
            expect(updated).toEqual({ a: { x: { y: 5 } } });
        });

        it('should update array values', () => {
            const obj = { arr: [1, 2, 3] };
            const updated = updateDeep(obj, ['arr', 1], 42);
            expect(updated).toEqual({ arr: [1, 42, 3] });
        });

        it('should return value if path is empty', () => {
            expect(updateDeep({ a: 1 }, [], 123)).toBe(123);
        });

        it('should return original object for invalid key', () => {
            const obj = { a: 1 };
            expect(updateDeep(obj, [undefined as any], 2)).toEqual(obj);
        });
    });
});
