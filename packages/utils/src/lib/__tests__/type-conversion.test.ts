import { describe, it, expect } from 'vitest';
import { toBoolean, toDate, toNumber } from '../type-conversion';

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

        describe('toNumber', () => {
            it('should return the number value for number inputs', () => {
                expect(toNumber(0)).toBe(0);
                expect(toNumber(42)).toBe(42);
                expect(toNumber(-10)).toBe(-10);
                expect(toNumber(3.14)).toBe(3.14);
            });

            it('should convert valid numeric strings to numbers', () => {
                expect(toNumber('0')).toBe(0);
                expect(toNumber('42')).toBe(42);
                expect(toNumber('-10')).toBe(-10);
                expect(toNumber('3.14')).toBe(3.14);
                expect(toNumber('  123  ')).toBe(123);
            });

            it('should return undefined for non-numeric strings', () => {
                expect(toNumber('abc')).toBeUndefined();
                expect(toNumber('12abc')).toBeUndefined();
                expect(toNumber('not a number')).toBeUndefined();
            });

            it('should return undefined for other types', () => {
                expect(toNumber(null)).toBeUndefined();
                expect(toNumber(undefined)).toBeUndefined();
                expect(toNumber(true)).toBeUndefined();
                expect(toNumber(false)).toBeUndefined();
                expect(toNumber({})).toBeUndefined();
                expect(toNumber([])).toBeUndefined();
            });

            it('should handle edge cases', () => {
                expect(toNumber('')).toBe(0);
                expect(toNumber('   ')).toBe(0);
                expect(toNumber('Infinity')).toBe(Infinity);
                expect(toNumber('-Infinity')).toBe(-Infinity);
            });

            describe('toDate', () => {
                it('should return the date value for Date inputs', () => {
                    const date = new Date('2024-01-15');
                    expect(toDate(date)).toBe(date);
                });

                it('should convert valid date strings to Date objects', () => {
                    const result = toDate('2024-01-15');
                    expect(result).toBeInstanceOf(Date);
                    expect(result?.getFullYear()).toBe(2024);
                    expect(result?.getMonth()).toBe(0);
                    expect(result?.getDate()).toBe(15);
                });

                it('should convert ISO date strings to Date objects', () => {
                    const isoString = '2024-01-15T10:30:00.000Z';
                    const result = toDate(isoString);
                    expect(result).toBeInstanceOf(Date);
                    expect(result?.toISOString()).toBe(isoString);
                });

                it('should convert timestamps to Date objects', () => {
                    const timestamp = 1705318200000;
                    const result = toDate(timestamp);
                    expect(result).toBeInstanceOf(Date);
                    expect(result?.getTime()).toBe(timestamp);
                });

                it('should return undefined for invalid date strings', () => {
                    expect(toDate('invalid date')).toBeUndefined();
                    expect(toDate('not a date')).toBeUndefined();
                    expect(toDate('2024-13-45')).toBeUndefined();
                });

                it('should return undefined for other types', () => {
                    expect(toDate(null)).toBeUndefined();
                    expect(toDate(undefined)).toBeUndefined();
                    expect(toDate(true)).toBeUndefined();
                    expect(toDate(false)).toBeUndefined();
                    expect(toDate({})).toBeUndefined();
                    expect(toDate([])).toBeUndefined();
                });

                it('should handle edge cases', () => {
                    expect(toDate(0)).toBeInstanceOf(Date);
                    expect(toDate('')).toBeUndefined();
                });
            });
        });
    });
});
