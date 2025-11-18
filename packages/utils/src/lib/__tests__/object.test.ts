import { describe, expect, it } from 'vitest';
import { pickBy } from '../object';
import { set } from '../object';

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

    describe('set', () => {
        it('should set a value at a top-level key', () => {
            const obj: any = {};
            set(obj, 'a', 1);
            expect(obj).toEqual({ a: 1 });
        });

        it('should set a value at a nested path (dot notation)', () => {
            const obj: any = {};
            set(obj, 'a.b.c', 42);
            expect(obj).toEqual({ a: { b: { c: 42 } } });
        });

        it('should set a value at a nested path (array notation)', () => {
            const obj: any = {};
            set(obj, ['x', 'y', 'z'], 'test');
            expect(obj).toEqual({ x: { y: { z: 'test' } } });
        });

        it('should overwrite existing value at path', () => {
            const obj: any = { a: { b: { c: 1 } } };
            set(obj, 'a.b.c', 99);
            expect(obj).toEqual({ a: { b: { c: 99 } } });
        });

        it('should create intermediate objects if they do not exist', () => {
            const obj: any = {};
            set(obj, 'foo.bar.baz', 'value');
            expect(obj).toEqual({ foo: { bar: { baz: 'value' } } });
        });

        it('should handle setting value on existing non-object property', () => {
            const obj: any = { a: 5 };
            set(obj, 'a.b', 10);
            expect(obj).toEqual({ a: { b: 10 } });
        });

        it('should return the original object', () => {
            const obj: any = {};
            const result = set(obj, 'key', 'val');
            expect(result).toBe(obj);
        });
    });
});
