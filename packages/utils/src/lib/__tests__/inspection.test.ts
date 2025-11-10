import { isBoolean, isDate, isNumber, isObject, isString } from '../inspection';
import { describe, it, expect } from 'vitest';

describe('Inspection', () => {
    describe('isBoolean', () => {
        it('should return true for a boolean value', () => {
            expect(isBoolean(true)).toBe(true);
            expect(isBoolean(false)).toBe(true);
        });

        it('should return false for non-boolean values', () => {
            expect(isBoolean(0)).toBe(false);
            expect(isBoolean('true')).toBe(false);
            expect(isBoolean({})).toBe(false);
            expect(isBoolean([])).toBe(false);
            expect(isBoolean(null)).toBe(false);
            expect(isBoolean(undefined)).toBe(false);
        });
    });

    describe('isDate', () => {
        it('should return true for a Date object', () => {
            expect(isDate(new Date())).toBe(true);
        });

        it('should return false for non-Date values', () => {
            expect(isDate('2022-01-01')).toBe(false);
            expect(isDate(1640995200000)).toBe(false);
            expect(isDate({})).toBe(false);
            expect(isDate([])).toBe(false);
            expect(isDate(null)).toBe(false);
            expect(isDate(undefined)).toBe(false);
        });
    });

    describe('isNumber', () => {
        it('should return true for a number value', () => {
            expect(isNumber(42)).toBe(true);
            expect(isNumber(3.14)).toBe(true);
        });

        it('should return false for non-number values', () => {
            expect(isNumber('42')).toBe(false);
            expect(isNumber(true)).toBe(false);
            expect(isNumber({})).toBe(false);
            expect(isNumber([])).toBe(false);
            expect(isNumber(null)).toBe(false);
            expect(isNumber(undefined)).toBe(false);
        });
    });

    describe('isObject', () => {
        it('should return true for an object value', () => {
            expect(isObject({})).toBe(true);
            expect(isObject({ name: 'John', age: 30 })).toBe(true);
        });

        it('should return false for non-object values', () => {
            expect(isObject('')).toBe(false);
            expect(isObject(42)).toBe(false);
            expect(isObject(true)).toBe(false);
            expect(isObject([])).toBe(false);
            expect(isObject(null)).toBe(false);
            expect(isObject(undefined)).toBe(false);
        });
    });

    describe('isString', () => {
        it('should return true for a string value', () => {
            expect(isString('hello')).toBe(true);
            expect(isString('world')).toBe(true);
        });

        it('should return false for non-string values', () => {
            expect(isString(42)).toBe(false);
            expect(isString(true)).toBe(false);
            expect(isString({})).toBe(false);
            expect(isString([])).toBe(false);
            expect(isString(null)).toBe(false);
            expect(isString(undefined)).toBe(false);
        });
    });
});
