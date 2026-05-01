import { isValidRowIndex } from '../constants';
import { describe, it, expect } from 'vitest';

describe('isValidRowIndex', () => {
    const DATASET_LENGTH = 10;

    it('should accept a valid in-bounds integer', () => {
        expect(isValidRowIndex(0, DATASET_LENGTH)).toBe(true);
        expect(isValidRowIndex(5, DATASET_LENGTH)).toBe(true);
        expect(isValidRowIndex(9, DATASET_LENGTH)).toBe(true);
    });

    it('should reject a negative integer', () => {
        expect(isValidRowIndex(-1, DATASET_LENGTH)).toBe(false);
        expect(isValidRowIndex(-100, DATASET_LENGTH)).toBe(false);
    });

    it('should reject a value equal to or exceeding dataset length', () => {
        expect(isValidRowIndex(10, DATASET_LENGTH)).toBe(false);
        expect(isValidRowIndex(100, DATASET_LENGTH)).toBe(false);
        expect(isValidRowIndex(11, DATASET_LENGTH)).toBe(false);
    });

    it('should reject a non-integer number (e.g. 3.7)', () => {
        expect(isValidRowIndex(3.7, DATASET_LENGTH)).toBe(false);
        expect(isValidRowIndex(0.1, DATASET_LENGTH)).toBe(false);
        expect(isValidRowIndex(9.999, DATASET_LENGTH)).toBe(false);
    });

    it('should reject a string value', () => {
        expect(isValidRowIndex('abc', DATASET_LENGTH)).toBe(false);
        expect(isValidRowIndex('3', DATASET_LENGTH)).toBe(false);
    });

    it('should reject null and undefined', () => {
        expect(isValidRowIndex(null, DATASET_LENGTH)).toBe(false);
        expect(isValidRowIndex(undefined, DATASET_LENGTH)).toBe(false);
    });

    it('should reject NaN and Infinity', () => {
        expect(isValidRowIndex(NaN, DATASET_LENGTH)).toBe(false);
        expect(isValidRowIndex(Infinity, DATASET_LENGTH)).toBe(false);
        expect(isValidRowIndex(-Infinity, DATASET_LENGTH)).toBe(false);
    });

    it('should reject boolean values', () => {
        expect(isValidRowIndex(true, DATASET_LENGTH)).toBe(false);
        expect(isValidRowIndex(false, DATASET_LENGTH)).toBe(false);
    });

    it('should reject an object or array', () => {
        expect(isValidRowIndex({}, DATASET_LENGTH)).toBe(false);
        expect(isValidRowIndex([], DATASET_LENGTH)).toBe(false);
    });

    it('should handle a dataset length of 0', () => {
        expect(isValidRowIndex(0, 0)).toBe(false);
    });
});
