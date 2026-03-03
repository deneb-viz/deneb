import { describe, expect, it, vi } from 'vitest';

vi.mock('../../interactivity', () => ({
    isCrossHighlightPropSet: () => false
}));

import {
    getDatumFieldsFromMetadata,
    getEncodedFieldName,
    getResolvedValueDescriptor,
    isSourceField
} from '../fields';
import type { AugmentedMetadataField } from '../types';

/**
 * Helper to create a minimal AugmentedMetadataField for testing.
 */
const mockField = (
    overrides: Partial<{
        displayName: string;
        queryName: string;
        isMeasure: boolean;
        type: powerbi.ValueTypeDescriptor;
        source: AugmentedMetadataField['source'];
        encodedName: string;
    }> = {}
): AugmentedMetadataField => ({
    column: {
        displayName: overrides.displayName ?? 'Field',
        queryName: overrides.queryName,
        isMeasure: overrides.isMeasure ?? false,
        type: overrides.type ?? { text: true }
    } as powerbi.DataViewMetadataColumn,
    source: overrides.source ?? 'categories',
    sourceIndex: 0,
    encodedName: overrides.encodedName
});

describe('getResolvedValueDescriptor', () => {
    it('should return "bool" when type is a boolean', () => {
        const type: powerbi.ValueTypeDescriptor = { bool: true };
        const result = getResolvedValueDescriptor(type);
        expect(result).toEqual('bool');
    });

    it('should return "text" when type is a text', () => {
        const type: powerbi.ValueTypeDescriptor = { text: true };
        const result = getResolvedValueDescriptor(type);
        expect(result).toEqual('text');
    });

    it('should return "numeric" when type is numeric', () => {
        const type: powerbi.ValueTypeDescriptor = { numeric: true };
        const result = getResolvedValueDescriptor(type);
        expect(result).toEqual('numeric');
    });

    it('should return "dateTime" when type is a dateTime', () => {
        const type: powerbi.ValueTypeDescriptor = { dateTime: true };
        const result = getResolvedValueDescriptor(type);
        expect(result).toEqual('dateTime');
    });

    it('should return "other" when type is not recognized', () => {
        const type: powerbi.ValueTypeDescriptor = {};
        const result = getResolvedValueDescriptor(type);
        expect(result).toEqual('other');
    });
});

describe('isSourceField', () => {
    it('should return true for "categories"', () => {
        expect(isSourceField('categories')).toBe(true);
    });

    it('should return true for "values"', () => {
        expect(isSourceField('values')).toBe(true);
    });

    it('should return false for "highlights"', () => {
        expect(isSourceField('highlights')).toBe(false);
    });

    it('should return false for "formatting"', () => {
        expect(isSourceField('formatting')).toBe(false);
    });

    it('should return false for "none"', () => {
        expect(isSourceField('none')).toBe(false);
    });
});

describe('getEncodedFieldName', () => {
    it('should return name unchanged when no special characters', () => {
        expect(getEncodedFieldName('Sales')).toBe('Sales');
    });

    it('should replace dots with underscores', () => {
        expect(getEncodedFieldName('Date.Year')).toBe('Date_Year');
    });

    it('should replace backslashes with underscores', () => {
        expect(getEncodedFieldName('Path\\Name')).toBe('Path_Name');
    });

    it('should replace quotes with underscores', () => {
        expect(getEncodedFieldName('Field"Name')).toBe('Field_Name');
    });

    it('should replace square brackets with underscores', () => {
        expect(getEncodedFieldName('Field[0]')).toBe('Field_0_');
    });

    it('should return empty string for falsy input', () => {
        expect(getEncodedFieldName(undefined as unknown as string)).toBe('');
    });
});

describe('getDatumFieldsFromMetadata', () => {
    it('should map category field with grouping role', () => {
        const fields = [
            mockField({
                displayName: 'Category',
                queryName: 'Table.Category',
                source: 'categories',
                type: { text: true }
            })
        ];
        const result = getDatumFieldsFromMetadata(fields);
        expect(result['Category']).toBeDefined();
        expect(result['Category'].role).toBe('grouping');
        expect(result['Category'].dataType).toBe('text');
        expect(result['Category'].isSupportField).toBeUndefined();
    });

    it('should map measure field with aggregation role', () => {
        const fields = [
            mockField({
                displayName: 'Sales',
                queryName: 'Table.Sales',
                source: 'values',
                isMeasure: true,
                type: { numeric: true }
            })
        ];
        const result = getDatumFieldsFromMetadata(fields);
        expect(result['Sales']).toBeDefined();
        expect(result['Sales'].role).toBe('aggregation');
        expect(result['Sales'].dataType).toBe('numeric');
        expect(result['Sales'].isSupportField).toBeUndefined();
    });

    it('should map non-measure value field with grouping role', () => {
        const fields = [
            mockField({
                displayName: 'Date',
                queryName: 'Table.Date',
                source: 'values',
                isMeasure: false,
                type: { dateTime: true }
            })
        ];
        const result = getDatumFieldsFromMetadata(fields);
        expect(result['Date'].role).toBe('grouping');
        expect(result['Date'].dataType).toBe('dateTime');
    });

    it('should mark highlight fields as support fields', () => {
        const fields = [
            mockField({
                displayName: 'Sales__highlight',
                source: 'highlights'
            })
        ];
        const result = getDatumFieldsFromMetadata(fields);
        expect(result['Sales__highlight'].isSupportField).toBe(true);
        expect(result['Sales__highlight'].role).toBeUndefined();
        expect(result['Sales__highlight'].dataType).toBeUndefined();
    });

    it('should mark formatting fields as support fields', () => {
        const fields = [
            mockField({
                displayName: 'Sales__format',
                source: 'formatting'
            })
        ];
        const result = getDatumFieldsFromMetadata(fields);
        expect(result['Sales__format'].isSupportField).toBe(true);
        expect(result['Sales__format'].role).toBeUndefined();
    });

    it('should use queryName as id', () => {
        const fields = [
            mockField({
                displayName: 'Category',
                queryName: 'Table.Category',
                source: 'categories'
            })
        ];
        const result = getDatumFieldsFromMetadata(fields);
        expect(result['Category'].id).toBe('Table.Category');
    });

    it('should fall back to displayName as id when queryName is missing', () => {
        const fields = [
            mockField({
                displayName: 'Category',
                queryName: undefined,
                source: 'categories'
            })
        ];
        const result = getDatumFieldsFromMetadata(fields);
        expect(result['Category'].id).toBe('Category');
    });

    it('should use pre-encoded name as record key when available', () => {
        const fields = [
            mockField({
                displayName: 'Date.Year',
                source: 'categories',
                encodedName: 'Date_Year'
            })
        ];
        const result = getDatumFieldsFromMetadata(fields);
        expect(result['Date_Year']).toBeDefined();
        expect(result['Date.Year']).toBeUndefined();
    });

    it('should encode field name as record key when encodedName not pre-set', () => {
        const fields = [
            mockField({
                displayName: 'Date.Year',
                source: 'categories',
                encodedName: undefined
            })
        ];
        const result = getDatumFieldsFromMetadata(fields);
        expect(result['Date_Year']).toBeDefined();
    });

    it('should preserve hostMetadata on each field', () => {
        const field = mockField({
            displayName: 'Sales',
            source: 'values'
        });
        const result = getDatumFieldsFromMetadata([field]);
        expect(result['Sales'].hostMetadata).toBe(field);
    });
});
