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
});

describe('getPrunedObject', () => {
    it('should prune deep objects at default depth (3)', () => {
        const nested = { a: { b: { c: { d: { e: 1 } } } } };
        const pruned = getPrunedObject(nested); // default maxDepth = 3
        expect(pruned.a.b.c.d).toBe('[OBJECT]');
        expect(typeof pruned.a.b.c).toBe('object');
    });

    it('should respect custom prune depth', () => {
        const nested = { a: { b: { c: { d: 1 } } } };
        const pruned = getPrunedObject(nested, { maxDepth: 2 });
        expect(pruned.a.b.c).toBe('[OBJECT]');
    });

    it('should keep deeper objects when depth large enough', () => {
        const nested = { a: { b: { c: { d: 1 } } } };
        const pruned = getPrunedObject(nested, { maxDepth: 10 });
        expect(pruned.a.b.c.d).toBe(1);
    });

    it('should mark circular references', () => {
        const obj: any = { a: 1 };
        obj.self = obj;
        const pruned = getPrunedObject(obj, { maxDepth: 5 });
        expect(pruned.self).toBe('[CIRCULAR]');
    });

    it('should convert undefined and null values to strings', () => {
        const obj = { a: undefined, b: null };
        const pruned = getPrunedObject(obj, { maxDepth: 5 });
        expect(pruned.a).toBe('undefined');
        expect(pruned.b).toBe('null');
    });

    it('should remove _scenegraph from dataflow objects', () => {
        const obj = { dataflow: { _scenegraph: { big: true }, keep: 2 } };
        const pruned = getPrunedObject(obj, { maxDepth: 5 });
        expect(pruned.dataflow._scenegraph).toBeUndefined();
        expect(pruned.dataflow.keep).toBe(2);
    });

    it('should handle maxDepth = 0 in getPrunedObject', () => {
        const obj = { a: { b: 1 }, c: 2 };
        const pruned = getPrunedObject(obj, { maxDepth: 0 });
        expect(pruned.a).toBe('[OBJECT]');
        expect(pruned.c).toBe(2);
    });
});

describe('stringifyPruned', () => {
    it('should prune nested objects beyond specified depth', () => {
        const obj = { a: { b: { c: { d: { e: 1 } } } } };
        const parsed = JSON.parse(stringifyPruned(obj, { maxDepth: 2 }));
        expect(parsed.a.b.c).toBe('[OBJECT]');
    });

    it('should handle maxDepth = 0 (prune first-level children)', () => {
        const obj = { a: { b: 1 }, c: 2 };
        const parsed = JSON.parse(stringifyPruned(obj, { maxDepth: 0 }));
        expect(parsed.a).toBe('[OBJECT]');
        expect(parsed.c).toBe(2); // primitive kept
    });

    it('should mark circular references', () => {
        const obj: any = { a: { b: 1 } };
        obj.a.self = obj.a;
        const parsed = JSON.parse(stringifyPruned(obj, { maxDepth: 5 }));
        expect(parsed.a.self).toBe('[CIRCULAR]');
    });

    it('should not mark duplicated (non-circular) shared references as circular', () => {
        const shared = { v: 1 };
        const obj = { a: shared, b: shared };
        const parsed = JSON.parse(stringifyPruned(obj, { maxDepth: 5 }));
        expect(parsed.a).toEqual({ v: 1 });
        expect(parsed.b).toEqual({ v: 1 });
    });

    it('should convert undefined and null values to strings', () => {
        const obj = { a: undefined, b: null, c: { d: undefined } };
        const parsed = JSON.parse(stringifyPruned(obj, { maxDepth: 5 }));
        expect(parsed.a).toBe('undefined');
        expect(parsed.b).toBe('null');
        expect(parsed.c.d).toBe('undefined');
    });

    it("should serialize arrays with undefined entries as 'undefined'", () => {
        const obj = { arr: [1, undefined, null, 4] };
        const parsed = JSON.parse(stringifyPruned(obj, { maxDepth: 5 }));
        expect(parsed.arr[1]).toBe('undefined');
        expect(parsed.arr[2]).toBe('null');
    });

    it('should remove _scenegraph from dataflow objects and mutate original object', () => {
        const obj: any = { dataflow: { _scenegraph: { huge: true }, keep: 1 } };
        const parsed = JSON.parse(
            stringifyPruned(obj, { maxDepth: 5, spaces: 0 })
        );
        expect(parsed.dataflow._scenegraph).toBeUndefined();
        expect(parsed.dataflow.keep).toBe(1);
        // original object mutated per implementation intent
        expect(obj.dataflow._scenegraph).toBeUndefined();
    });

    it('should respect spacing = 4 producing indented JSON', () => {
        const str = stringifyPruned(
            { a: { b: 1 } },
            { maxDepth: 5, spaces: 4 }
        );
        expect(str.split('\n').length).toBeGreaterThan(1);
        expect(str).toContain('"b": 1');
    });

    it('should not introduce newline characters when spacing = 0', () => {
        const str = stringifyPruned({ a: { b: 1 } }, { maxDepth: 5 });
        expect(str.includes('\n')).toBe(false);
    });

    it('should leave deep structure intact when depth sufficiently large', () => {
        const obj = { a: { b: { c: { d: { e: 5 } } } } };
        const parsed = JSON.parse(stringifyPruned(obj, { maxDepth: 10 }));
        expect(parsed.a.b.c.d.e).toBe(5);
    });

    it('should use custom whitespaceChar for indentation', () => {
        const str = stringifyPruned(
            { a: { b: 1 } },
            { maxDepth: 5, spaces: 3, whitespaceChar: '.' }
        );
        expect(str).toContain('\n...' + '"a"');
    });

    it('should use only the first character of whitespaceChar string', () => {
        const str = stringifyPruned(
            { a: 1 },
            { maxDepth: 5, spaces: 2, whitespaceChar: 'ab' }
        );
        expect(str).toContain('\n' + 'aa' + '"a"');
    });

    it('should fallback to space when whitespaceChar is empty', () => {
        const str = stringifyPruned(
            { a: 1 },
            { maxDepth: 5, spaces: 2, whitespaceChar: '' }
        );
        expect(str).toContain('\n' + '  ' + '"a"');
    });

    it('should cap spacing to a maximum of 10 characters', () => {
        const str = stringifyPruned(
            { a: { b: 1 } },
            { maxDepth: 5, spaces: 20, whitespaceChar: 'x' }
        );
        expect(str).toContain('\n' + 'x'.repeat(10) + '"a"');
    });

    it("should not remove _scenegraph when key is not 'dataflow'", () => {
        const obj: any = {
            notDataflow: { _scenegraph: { keep: true }, other: 1 }
        };
        const parsed = JSON.parse(stringifyPruned(obj, { maxDepth: 5 }));
        expect(parsed.notDataflow._scenegraph).toEqual({ keep: true });
        expect(obj.notDataflow._scenegraph).toEqual({ keep: true });
    });

    it('should mark circular references in arrays', () => {
        const arr: any[] = [1];
        arr.push(arr);
        const parsed = JSON.parse(stringifyPruned({ arr }, { maxDepth: 5 }));
        expect(parsed.arr[1]).toBe('[CIRCULAR]');
    });
});
