import { describe, expect, it } from 'vitest';
import { normalizeFieldsInput, enrichFields } from '../normalization';
import type { DatasetFields } from '../types';

describe('normalizeFieldsInput', () => {
    it('should return empty object for undefined input', () => {
        const result = normalizeFieldsInput(undefined);
        expect(result).toEqual({});
    });

    it('should convert array of strings to record with template-eligible defaults', () => {
        const result = normalizeFieldsInput(['a', 'b', 'c']);
        expect(result).toEqual({
            a: { role: 'grouping', dataType: 'other' },
            b: { role: 'grouping', dataType: 'other' },
            c: { role: 'grouping', dataType: 'other' }
        });
    });

    it('should make array fields template-eligible with role and dataType', () => {
        const result = normalizeFieldsInput(['category', 'amount']);
        expect(result.category.role).toBe('grouping');
        expect(result.category.dataType).toBe('other');
        expect(result.amount.role).toBe('grouping');
        expect(result.amount.dataType).toBe('other');
    });

    it('should pass through record input unchanged', () => {
        const input: DatasetFields = {
            a: { role: 'grouping', dataType: 'text' },
            b: { role: 'aggregation', dataType: 'numeric' }
        };
        const result = normalizeFieldsInput(input);
        expect(result).toEqual(input);
    });

    it('should handle empty array', () => {
        const result = normalizeFieldsInput([]);
        expect(result).toEqual({});
    });

    it('should handle empty record', () => {
        const result = normalizeFieldsInput({});
        expect(result).toEqual({});
    });

    it('should handle record with empty field objects', () => {
        const input: DatasetFields = {
            a: {},
            b: {}
        };
        const result = normalizeFieldsInput(input);
        expect(result).toEqual(input);
    });

    it('should preserve field metadata when passed as record', () => {
        const input: DatasetFields = {
            category: {
                id: 'cat-id',
                role: 'grouping',
                dataType: 'text',
                description: 'Category field'
            }
        };
        const result = normalizeFieldsInput(input);
        expect(result.category).toEqual(input.category);
    });
});

describe('enrichFields', () => {
    it('should add new properties to empty field objects', () => {
        const existing: DatasetFields = { a: {}, b: {} };
        const enrichment = {
            a: { role: 'grouping' as const, dataType: 'text' as const },
            b: { role: 'aggregation' as const, dataType: 'numeric' as const }
        };
        const result = enrichFields(existing, enrichment);

        expect(result.a.role).toBe('grouping');
        expect(result.a.dataType).toBe('text');
        expect(result.b.role).toBe('aggregation');
        expect(result.b.dataType).toBe('numeric');
    });

    it('should preserve existing properties over new ones', () => {
        const existing: DatasetFields = {
            a: { role: 'grouping', dataType: 'text' }
        };
        const enrichment = {
            a: { role: 'aggregation' as const, dataType: 'numeric' as const }
        };
        const result = enrichFields(existing, enrichment);

        // Existing values should be preserved
        expect(result.a.role).toBe('grouping');
        expect(result.a.dataType).toBe('text');
    });

    it('should only fill undefined properties', () => {
        const existing: DatasetFields = {
            a: { role: 'grouping' } // dataType is undefined
        };
        const enrichment = {
            a: { role: 'aggregation' as const, dataType: 'text' as const }
        };
        const result = enrichFields(existing, enrichment);

        // role should be preserved, dataType should be filled
        expect(result.a.role).toBe('grouping');
        expect(result.a.dataType).toBe('text');
    });

    it('should not modify fields without enrichment', () => {
        const existing: DatasetFields = {
            a: { role: 'grouping' },
            b: { role: 'aggregation' }
        };
        const enrichment = {
            a: { dataType: 'text' as const }
            // No enrichment for 'b'
        };
        const result = enrichFields(existing, enrichment);

        expect(result.a.dataType).toBe('text');
        expect(result.b).toEqual({ role: 'aggregation' });
    });

    it('should handle empty enrichment', () => {
        const existing: DatasetFields = {
            a: { role: 'grouping' }
        };
        const result = enrichFields(existing, {});

        expect(result).toEqual(existing);
    });

    it('should handle empty existing fields', () => {
        const existing: DatasetFields = {};
        const enrichment = {
            a: { role: 'grouping' as const }
        };
        const result = enrichFields(existing, enrichment);

        expect(result).toEqual({});
    });

    it('should enrich id and description properties', () => {
        const existing: DatasetFields = { a: {} };
        const enrichment = {
            a: { id: 'field-id', description: 'A field description' }
        };
        const result = enrichFields(existing, enrichment);

        expect(result.a.id).toBe('field-id');
        expect(result.a.description).toBe('A field description');
    });
});
