import { describe, expect, it } from 'vitest';
import {
    MEASURE_FLAGS,
    COLUMN_FLAGS,
    FLAG_LABELS,
    FLAG_INFO
} from '../dataset-settings-utils';

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
