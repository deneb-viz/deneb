import { describe, expect, it } from 'vitest';
import {
    encodeValue,
    decodeValue,
    MEASURE_FLAGS,
    COLUMN_FLAGS,
    FLAG_LABELS,
    FLAG_INFO,
    VALUE_SEPARATOR
} from '../dataset-settings-utils';

describe('encodeValue / decodeValue round-trip', () => {
    it('should encode and decode a basic field name and flag', () => {
        const encoded = encodeValue('Sales', 'highlight');
        expect(encoded).toBe('Sales::highlight');
        expect(decodeValue(encoded)).toEqual(['Sales', 'highlight']);
    });

    it('should handle field names with spaces', () => {
        const encoded = encodeValue('$ Sales', 'format');
        expect(encoded).toBe('$ Sales::format');
        expect(decodeValue(encoded)).toEqual(['$ Sales', 'format']);
    });

    it('should handle field names with special characters', () => {
        const encoded = encodeValue('Amount (USD)', 'formatted');
        expect(encoded).toBe('Amount (USD)::formatted');
        expect(decodeValue(encoded)).toEqual(['Amount (USD)', 'formatted']);
    });

    it('should round-trip all MEASURE_FLAGS correctly', () => {
        const fieldName = 'TestField';
        for (const flag of MEASURE_FLAGS) {
            const encoded = encodeValue(fieldName, flag);
            const [decodedField, decodedFlag] = decodeValue(encoded);
            expect(decodedField).toBe(fieldName);
            expect(decodedFlag).toBe(flag);
        }
    });
});

describe('decodeValue with ambiguous separators', () => {
    it('should use lastIndexOf to split field names containing the separator', () => {
        const value = `weird${VALUE_SEPARATOR}name${VALUE_SEPARATOR}highlight`;
        const [fieldName, flag] = decodeValue(value);
        expect(fieldName).toBe('weird::name');
        expect(flag).toBe('highlight');
    });
});

describe('flag applicability', () => {
    it('MEASURE_FLAGS has exactly 5 entries', () => {
        expect(MEASURE_FLAGS).toHaveLength(5);
    });

    it('MEASURE_FLAGS contains the expected keys', () => {
        expect([...MEASURE_FLAGS]).toEqual([
            'highlight',
            'highlightStatus',
            'highlightComparator',
            'format',
            'formatted'
        ]);
    });

    it('COLUMN_FLAGS has exactly 2 entries', () => {
        expect(COLUMN_FLAGS).toHaveLength(2);
    });

    it('COLUMN_FLAGS contains the expected keys', () => {
        expect([...COLUMN_FLAGS]).toEqual(['format', 'formatted']);
    });

    it('COLUMN_FLAGS is a subset of MEASURE_FLAGS', () => {
        for (const flag of COLUMN_FLAGS) {
            expect(MEASURE_FLAGS).toContain(flag);
        }
    });
});

describe('FLAG_LABELS coverage', () => {
    it('every MEASURE_FLAGS entry has a corresponding key in FLAG_LABELS', () => {
        for (const flag of MEASURE_FLAGS) {
            expect(FLAG_LABELS).toHaveProperty(flag);
            expect(typeof FLAG_LABELS[flag]).toBe('string');
            expect(FLAG_LABELS[flag].length).toBeGreaterThan(0);
        }
    });
});

describe('FLAG_INFO coverage', () => {
    it('every MEASURE_FLAGS entry has a corresponding key in FLAG_INFO', () => {
        for (const flag of MEASURE_FLAGS) {
            expect(FLAG_INFO).toHaveProperty(flag);
            expect(typeof FLAG_INFO[flag]).toBe('string');
            expect(FLAG_INFO[flag]!.length).toBeGreaterThan(0);
        }
    });
});
