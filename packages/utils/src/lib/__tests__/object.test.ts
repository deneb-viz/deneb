import { describe, expect, it } from 'vitest';
import {
    getPrunedObject,
    omit,
    pickBy,
    stringifyPruned,
    updateDeep
} from '../object';

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

    describe('prune', () => {
        it('should handle circular references gracefully', () => {
            const obj: any = { a: 1 };
            obj.self = obj;
            const pruned = JSON.parse(stringifyPruned(obj));
            expect(pruned.self).toBe('[CIRCULAR]');
        });

        it('should prune objects deeper than maxDepth', () => {
            const deepObj = { a: { b: { c: { d: { e: 5 } } } } };
            const pruned = JSON.parse(
                stringifyPruned(deepObj, { maxDepth: 2 })
            );
            expect(pruned.a.b).toEqual({ c: '[OBJECT]' });
        });

        it('should replace undefined with "undefined" and null with "null"', () => {
            const obj = { a: undefined, b: null, c: 1 };
            const pruned = JSON.parse(stringifyPruned(obj));
            expect(pruned.a).toBe('undefined');
            expect(pruned.b).toBe('null');
            expect(pruned.c).toBe(1);
        });

        it('should remove _scenegraph from dataflow objects', () => {
            const obj = { dataflow: { _scenegraph: { foo: 'bar' }, value: 1 } };
            const pruned = JSON.parse(stringifyPruned(obj));
            expect(pruned.dataflow._scenegraph).toBeUndefined();
            expect(pruned.dataflow.value).toBe(1);
        });

        it('should use custom whitespaceChar and maxLength', () => {
            const obj = { a: 1, b: { c: 2 } };
            const str = stringifyPruned(obj, {
                whitespaceChar: '-',
                maxLength: 10
            });
            expect(str).toContain('-');
        });
    });

    describe('getPrunedObject', () => {
        it('getPrunedObject should return a pruned object', () => {
            const deepObj = { a: { b: { c: { d: 1 } } } };
            const pruned = getPrunedObject(deepObj, { maxDepth: 2 });
            expect(pruned.a.b).toEqual({ c: '[OBJECT]' });
        });

        it('should handle objects with arrays and nested objects', () => {
            const obj = {
                a: [1, 2, { b: 3 }],
                c: { d: { e: 4 } }
            };
            const pruned = getPrunedObject(obj, { maxDepth: 2 });
            expect(pruned.a[2]).toEqual({ b: 3 });
            expect(pruned.c.d).toEqual({ e: 4 });
        });

        it('should handle empty objects and arrays', () => {
            const obj = { a: {}, b: [] };
            const pruned = JSON.parse(stringifyPruned(obj));
            expect(pruned.a).toEqual({});
            expect(pruned.b).toEqual([]);
        });

        it('should not mutate the original object', () => {
            const obj = { a: { b: 1 } };
            const copy = JSON.parse(JSON.stringify(obj));
            getPrunedObject(obj, { maxDepth: 1 });
            expect(obj).toEqual(copy);
        });
    });

    describe('stringifyPruned', () => {
        it('should handle primitive values', () => {
            const obj = { str: 'hello', num: 42, bool: true };
            const pruned = getPrunedObject(obj);
            expect(pruned).toEqual(obj);
        });

        it('should apply custom maxLength option', () => {
            const obj = { a: 1, b: 2, c: 3, d: 4, e: 5 };
            const str = stringifyPruned(obj, { maxLength: 5 });
            expect(str).toContain('\n');
        });

        it('should handle deeply nested arrays', () => {
            const obj = { arr: [[['deep']]] };
            const pruned = getPrunedObject(obj, { maxDepth: 2 });
            expect(pruned.arr[0][0]).toBe('[OBJECT]');
        });
    });
});
