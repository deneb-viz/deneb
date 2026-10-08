import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
    formatJson,
    getPrunedObject,
    matchesObjectKeyValues,
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
        const pruned = JSON.parse(stringifyPruned(deepObj, { maxDepth: 2 }));
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

    it('should write an invalid date as "null"', () => {
        const pruned = getPrunedObject({ d: new Date(NaN) });
        expect(pruned.d).toBe('null');
    });
});

// Under UTC, local and UTC strings differ only by the trailing `Z`, so a
// missing or reversed offset would go unnoticed. These zones sit either side
// of UTC, one with a half-hour offset. Dates are constructed inside each test,
// after the zone is applied.
describe.each(['America/New_York', 'Asia/Kolkata'])(
    'prune dates in %s',
    (timeZone) => {
        const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        beforeAll(() => {
            process.env.TZ = timeZone;
        });

        afterAll(() => {
            process.env.TZ = systemTimeZone;
        });

        it('should write dates in local time with no zone designator', () => {
            const rows = [
                { row: 0, Date: new Date(2020, 11, 1) },
                { row: 1, Date: new Date(2020, 11, 2) }
            ];
            expect(getPrunedObject(rows)).toEqual([
                { row: 0, Date: '2020-12-01T00:00:00.000' },
                { row: 1, Date: '2020-12-02T00:00:00.000' }
            ]);
        });

        it('should keep the local time component of a date', () => {
            const pruned = getPrunedObject({
                d: new Date(2020, 11, 1, 13, 45, 30, 123)
            });
            expect(pruned.d).toBe('2020-12-01T13:45:30.123');
        });

        it('should write nested dates in local time', () => {
            const pruned = getPrunedObject({
                a: { b: [new Date(2020, 0, 31)] }
            });
            expect(pruned.a.b[0]).toBe('2020-01-31T00:00:00.000');
        });
    }
);

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

    describe('matchesObjectKeyValues', () => {
        it('should return true when object matches all source key-value pairs', () => {
            const source = { a: 1, b: 2 };
            const object = { a: 1, b: 2, c: 3 };
            const matcher = matchesObjectKeyValues(source);
            expect(matcher(object)).toBe(true);
        });

        it('should return false when object does not match source', () => {
            const source = { a: 1, b: 2 };
            const object = { a: 1, b: 3 };
            const matcher = matchesObjectKeyValues(source);
            expect(matcher(object)).toBe(false);
        });

        it('should return true for empty source object', () => {
            const source = {};
            const object = { a: 1, b: 2 };
            const matcher = matchesObjectKeyValues(source);
            expect(matcher(object)).toBe(true);
        });

        it('should return false when object is missing required keys', () => {
            const source = { a: 1, b: 2 };
            const object = { a: 1 };
            const matcher = matchesObjectKeyValues(source);
            expect(matcher(object)).toBe(false);
        });

        it('should handle objects with different value types', () => {
            const source = { str: 'hello', num: 42, bool: true };
            const object = {
                str: 'hello',
                num: 42,
                bool: true,
                extra: 'value'
            };
            const matcher = matchesObjectKeyValues(source);
            expect(matcher(object)).toBe(true);
        });

        it('should use strict equality for comparison', () => {
            const source = { a: 1 };
            const object = { a: '1' };
            const matcher = matchesObjectKeyValues(source);
            expect(matcher(object)).toBe(false);
        });

        it('should handle null and undefined values', () => {
            const source = { a: null, b: undefined };
            const object = { a: null, b: undefined };
            const matcher = matchesObjectKeyValues(source);
            expect(matcher(object)).toBe(true);
        });
    });
});

describe('formatJson', () => {
    it('should format an object with default 2-space indentation', () => {
        const obj = { a: 1, b: 2 };
        const result = formatJson(obj);
        expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
    });

    it('should format nested objects with correct indentation', () => {
        const obj = { a: { b: 1 } };
        const result = formatJson(obj);
        expect(result).toBe('{\n  "a": {\n    "b": 1\n  }\n}');
    });

    it('should accept a custom indent size', () => {
        const obj = { a: 1 };
        const result = formatJson(obj, 4);
        expect(result).toBe('{\n    "a": 1\n}');
    });

    it('should format arrays', () => {
        const arr = [1, 2, 3];
        const result = formatJson(arr);
        expect(result).toBe('[\n  1,\n  2,\n  3\n]');
    });

    it('should return "null" for null input', () => {
        expect(formatJson(null)).toBe('null');
    });

    it('should return undefined for undefined input', () => {
        expect(formatJson(undefined)).toBeUndefined();
    });

    it('should format primitive values', () => {
        expect(formatJson('hello')).toBe('"hello"');
        expect(formatJson(42)).toBe('42');
        expect(formatJson(true)).toBe('true');
    });
});
