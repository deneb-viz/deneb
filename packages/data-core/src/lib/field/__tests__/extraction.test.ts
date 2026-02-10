import { describe, expect, it } from 'vitest';
import {
    getDatasetFieldsInclusive,
    getDatasetTemplateFieldsFromMetadata
} from '../extraction';
import type { DatasetFields } from '../types';

describe('getDatasetFieldsInclusive', () => {
    it('should return empty object for undefined input', () => {
        const result = getDatasetFieldsInclusive(undefined);
        expect(result).toEqual({});
    });

    it('should return empty object for empty fields', () => {
        const result = getDatasetFieldsInclusive({});
        expect(result).toEqual({});
    });

    it('should include fields with role property', () => {
        const fields: DatasetFields = {
            a: { id: 'a', role: 'grouping' }
        };
        const result = getDatasetFieldsInclusive(fields);
        expect(result.a).toBeDefined();
    });

    it('should include fields with dataType property', () => {
        const fields: DatasetFields = {
            a: { id: 'a', dataType: 'text' }
        };
        const result = getDatasetFieldsInclusive(fields);
        expect(result.a).toBeDefined();
    });

    it('should include fields with both role and dataType', () => {
        const fields: DatasetFields = {
            a: { id: 'a', role: 'grouping', dataType: 'text' }
        };
        const result = getDatasetFieldsInclusive(fields);
        expect(result.a).toBeDefined();
    });

    it('should exclude fields without role or dataType', () => {
        const fields: DatasetFields = {
            a: { id: 'a' },
            b: { id: 'b', role: 'grouping' }
        };
        const result = getDatasetFieldsInclusive(fields);
        expect(result.a).toBeUndefined();
        expect(result.b).toBeDefined();
    });

    it('should handle mixed fields correctly', () => {
        const fields: DatasetFields = {
            category: { id: 'cat', role: 'grouping', dataType: 'text' },
            measure: { id: 'meas', role: 'aggregation', dataType: 'numeric' },
            support: { id: 'sup' } // No role or dataType
        };
        const result = getDatasetFieldsInclusive(fields);
        expect(Object.keys(result)).toHaveLength(2);
        expect(result.category).toBeDefined();
        expect(result.measure).toBeDefined();
        expect(result.support).toBeUndefined();
    });
});

describe('getDatasetTemplateFieldsFromMetadata', () => {
    it('should return empty array for undefined input', () => {
        const result = getDatasetTemplateFieldsFromMetadata(undefined);
        expect(result).toEqual([]);
    });

    it('should return empty array for empty fields', () => {
        const result = getDatasetTemplateFieldsFromMetadata({});
        expect(result).toEqual([]);
    });

    it('should transform eligible fields to UsermetaDatasetField array', () => {
        const fields: DatasetFields = {
            a: { id: 'id-a', role: 'grouping', dataType: 'text' },
            b: { id: 'id-b', role: 'aggregation', dataType: 'numeric' }
        };
        const result = getDatasetTemplateFieldsFromMetadata(fields);
        expect(result).toHaveLength(2);
    });

    it('should assign sequential placeholders', () => {
        const fields: DatasetFields = {
            a: { id: 'id-a', role: 'grouping', dataType: 'text' },
            b: { id: 'id-b', role: 'aggregation', dataType: 'numeric' }
        };
        const result = getDatasetTemplateFieldsFromMetadata(fields);
        expect(result[0].key).toBe('__0__');
        expect(result[1].key).toBe('__1__');
    });

    it('should exclude fields without role or dataType', () => {
        const fields: DatasetFields = {
            a: { id: 'id-a', role: 'grouping', dataType: 'text' },
            b: { id: 'id-b' } // No role or dataType
        };
        const result = getDatasetTemplateFieldsFromMetadata(fields);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('a'); // Record key is used as name
    });

    it('should properly map role to kind', () => {
        const fields: DatasetFields = {
            cat: { id: 'id-cat', role: 'grouping', dataType: 'text' },
            val: { id: 'id-val', role: 'aggregation', dataType: 'numeric' }
        };
        const result = getDatasetTemplateFieldsFromMetadata(fields);
        const catField = result.find((f) => f.name === 'cat');
        const valField = result.find((f) => f.name === 'val');
        expect(catField?.kind).toBe('column');
        expect(valField?.kind).toBe('measure');
    });

    it('should properly map dataType to type', () => {
        const fields: DatasetFields = {
            a: { id: 'id-a', role: 'grouping', dataType: 'dateTime' }
        };
        const result = getDatasetTemplateFieldsFromMetadata(fields);
        expect(result[0].type).toBe('dateTime');
    });

    it('should use record key as name in result', () => {
        const fields: DatasetFields = {
            'my-field': { id: 'internal-id', role: 'grouping', dataType: 'text' }
        };
        const result = getDatasetTemplateFieldsFromMetadata(fields);
        expect(result[0].name).toBe('my-field');
    });
});
