import { describe, it, expect } from 'vitest';
import { toBoolean } from '../type-conversion';

describe('Type Conversion', () => {
    describe('toBoolean', () => {
        it('should return the boolean value for boolean inputs', () => {
            expect(toBoolean(true)).toBe(true);
            expect(toBoolean(false)).toBe(false);
        });

        it('should return true for truthy string values', () => {
            expect(toBoolean('1')).toBe(true);
            expect(toBoolean('true')).toBe(true);
            expect(toBoolean('yes')).toBe(true);
            expect(toBoolean('on')).toBe(true);
            expect(toBoolean('TRUE')).toBe(true);
            expect(toBoolean('  yes  ')).toBe(true);
        });

        it('should return false for falsy string values', () => {
            expect(toBoolean('0')).toBe(false);
            expect(toBoolean('false')).toBe(false);
            expect(toBoolean('no')).toBe(false);
            expect(toBoolean('off')).toBe(false);
            expect(toBoolean('')).toBe(false);
            expect(toBoolean('FALSE')).toBe(false);
            expect(toBoolean('  off  ')).toBe(false);
        });

        it('should return undefined for unrecognized string values', () => {
            expect(toBoolean('maybe')).toBeUndefined();
            expect(toBoolean('2')).toBeUndefined();
            expect(toBoolean('invalid')).toBeUndefined();
        });

        it('should return true for non-zero numbers', () => {
            expect(toBoolean(1)).toBe(true);
            expect(toBoolean(-1)).toBe(true);
            expect(toBoolean(42)).toBe(true);
            expect(toBoolean(3.14)).toBe(true);
        });

        it('should return false for zero', () => {
            expect(toBoolean(0)).toBe(false);
        });

        it('should return undefined for other types', () => {
            expect(toBoolean(null)).toBeUndefined();
            expect(toBoolean(undefined)).toBeUndefined();
            expect(toBoolean({})).toBeUndefined();
            expect(toBoolean([])).toBeUndefined();
        });
    });
});
