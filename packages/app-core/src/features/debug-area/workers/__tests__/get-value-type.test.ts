import { describe, expect, it } from 'vitest';

import { getValueType } from '../get-value-type';

describe('getValueType', () => {
    it('classifies a Date instance as "date"', () => {
        expect(getValueType(new Date())).toBe('date');
    });

    it('classifies integers and floats as "number"', () => {
        expect(getValueType(42)).toBe('number');
        expect(getValueType(3.14)).toBe('number');
        expect(getValueType(0)).toBe('number');
        expect(getValueType(-1)).toBe('number');
    });

    it('classifies NaN and Infinity as "number" (they are numeric types)', () => {
        expect(getValueType(NaN)).toBe('number');
        expect(getValueType(Infinity)).toBe('number');
        expect(getValueType(-Infinity)).toBe('number');
    });

    it('classifies arrays as "array" even when they are empty', () => {
        expect(getValueType([])).toBe('array');
        expect(getValueType([1, 2, 3])).toBe('array');
        expect(getValueType([{ a: 1 }])).toBe('array');
    });

    it('classifies plain objects as "object"', () => {
        expect(getValueType({})).toBe('object');
        expect(getValueType({ a: 1 })).toBe('object');
    });

    it('classifies booleans as "boolean"', () => {
        expect(getValueType(true)).toBe('boolean');
        expect(getValueType(false)).toBe('boolean');
    });

    it('classifies strings as "string"', () => {
        expect(getValueType('')).toBe('string');
        expect(getValueType('hello')).toBe('string');
    });

    it('classifies null and undefined as "invalid"', () => {
        expect(getValueType(null)).toBe('invalid');
        expect(getValueType(undefined)).toBe('invalid');
    });

    it('prefers "array" over "object" for array-like Array instances', () => {
        // Sanity check: ordering matters in the switch — arrays must be
        // classified before the plain-object fallback.
        expect(getValueType([1, 2])).toBe('array');
    });

    it('prefers "date" over "object" for Date instances', () => {
        // Sanity check: Dates are technically objects; the `date` classifier
        // must take precedence.
        expect(getValueType(new Date('2026-04-17'))).toBe('date');
    });
});
