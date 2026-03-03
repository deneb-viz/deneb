import { describe, expect, it } from 'vitest';
import {
    kindToRole,
    roleToKind,
    toUsermetaDatasetField,
    toUsermetaDatasetFields,
    withTemplateMetadata,
    withTemplateMetadataAll
} from '../template-metadata';
import type { DatasetField, UsermetaDatasetFieldKind } from '../types';

describe('roleToKind', () => {
    it('should return "column" for "grouping" role', () => {
        expect(roleToKind('grouping')).toBe('column');
    });

    it('should return "measure" for "aggregation" role', () => {
        expect(roleToKind('aggregation')).toBe('measure');
    });

    it('should return undefined when role is undefined', () => {
        expect(roleToKind(undefined)).toBeUndefined();
    });
});

describe('kindToRole', () => {
    it('should return "grouping" for "column" kind', () => {
        expect(kindToRole('column')).toBe('grouping');
    });

    it('should return "aggregation" for "measure" kind', () => {
        expect(kindToRole('measure')).toBe('aggregation');
    });

    it('should return undefined for "any" kind', () => {
        expect(kindToRole('any')).toBeUndefined();
    });

    it('should return undefined when kind is undefined', () => {
        expect(kindToRole(undefined)).toBeUndefined();
    });
});

describe('toUsermetaDatasetField', () => {
    const baseField: DatasetField = {
        id: 'field-id',
        role: 'grouping',
        dataType: 'text',
        description: 'A test field'
    };

    it('should transform DatasetField to UsermetaDatasetField', () => {
        const result = toUsermetaDatasetField('Field Name', baseField);
        expect(result).toEqual({
            key: 'field-id',
            name: 'Field Name',
            namePlaceholder: 'Field Name',
            description: 'A test field',
            kind: 'column',
            type: 'text'
        });
    });

    it('should use placeholder when provided', () => {
        const result = toUsermetaDatasetField('Field Name', baseField, {
            placeholder: '__0__'
        });
        expect(result.key).toBe('__0__');
    });

    it('should use field id when no placeholder provided', () => {
        const result = toUsermetaDatasetField('Field Name', baseField);
        expect(result.key).toBe('field-id');
    });

    it('should fallback to key when id not provided', () => {
        const fieldNoId: DatasetField = {
            role: 'grouping',
            dataType: 'text'
        };
        const result = toUsermetaDatasetField('my-key', fieldNoId);
        expect(result.key).toBe('my-key');
    });

    it('should default description to empty string', () => {
        const fieldNoDesc: DatasetField = {
            id: 'field-id'
        };
        const result = toUsermetaDatasetField('Field Name', fieldNoDesc);
        expect(result.description).toBe('');
    });

    it('should default type to "other" when dataType not set', () => {
        const fieldNoType: DatasetField = {
            id: 'field-id'
        };
        const result = toUsermetaDatasetField('Field Name', fieldNoType);
        expect(result.type).toBe('other');
    });

    it('should map aggregation role to measure kind', () => {
        const aggregationField: DatasetField = {
            id: 'measure-id',
            role: 'aggregation',
            dataType: 'numeric'
        };
        const result = toUsermetaDatasetField('Measure', aggregationField);
        expect(result.kind).toBe('measure');
    });

    it('should return undefined kind when role not set', () => {
        const fieldNoRole: DatasetField = {
            id: 'field-id',
            dataType: 'text'
        };
        const result = toUsermetaDatasetField('Field Name', fieldNoRole);
        expect(result.kind).toBeUndefined();
    });

    it('should use record key as name', () => {
        const result = toUsermetaDatasetField('my-record-key', baseField);
        expect(result.name).toBe('my-record-key');
    });
});

describe('toUsermetaDatasetFields', () => {
    const entries: [string, DatasetField][] = [
        ['a', { id: 'id-a', role: 'grouping', dataType: 'text' }],
        ['b', { id: 'id-b', role: 'aggregation', dataType: 'numeric' }]
    ];

    it('should transform array of field entries with sequential placeholders', () => {
        const result = toUsermetaDatasetFields(entries);
        expect(result).toHaveLength(2);
        expect(result[0].key).toBe('__0__');
        expect(result[1].key).toBe('__1__');
    });

    it('should preserve field properties in transformation', () => {
        const result = toUsermetaDatasetFields(entries);
        expect(result[0].name).toBe('a');
        expect(result[0].kind).toBe('column');
        expect(result[0].type).toBe('text');
        expect(result[1].name).toBe('b');
        expect(result[1].kind).toBe('measure');
        expect(result[1].type).toBe('numeric');
    });
});

describe('withTemplateMetadata', () => {
    const field: DatasetField = {
        id: 'field-id',
        role: 'grouping',
        dataType: 'text'
    };

    it('should add templateMetadata to field', () => {
        const result = withTemplateMetadata('Field Name', field);
        expect(result.templateMetadata).toBeDefined();
        expect(result.templateMetadata.key).toBe('field-id');
        expect(result.templateMetadata.name).toBe('Field Name');
    });

    it('should preserve original field properties', () => {
        const result = withTemplateMetadata('Field Name', field);
        expect(result.id).toBe('field-id');
        expect(result.role).toBe('grouping');
        expect(result.dataType).toBe('text');
    });

    it('should work with generic host metadata', () => {
        const fieldWithMeta: DatasetField<{ custom: string }> = {
            id: 'field-id',
            hostMetadata: { custom: 'value' }
        };
        const result = withTemplateMetadata('Field', fieldWithMeta);
        expect(result.hostMetadata?.custom).toBe('value');
        expect(result.templateMetadata).toBeDefined();
    });
});

describe('withTemplateMetadataAll', () => {
    const fields: Record<string, DatasetField> = {
        a: { id: 'id-a', role: 'grouping', dataType: 'text' },
        b: { id: 'id-b', role: 'aggregation', dataType: 'numeric' }
    };

    it('should add templateMetadata to all fields', () => {
        const result = withTemplateMetadataAll(fields);
        expect(result.a.templateMetadata).toBeDefined();
        expect(result.b.templateMetadata).toBeDefined();
    });

    it('should use record key as templateMetadata name', () => {
        const result = withTemplateMetadataAll(fields);
        expect(result.a.templateMetadata.name).toBe('a');
        expect(result.b.templateMetadata.name).toBe('b');
    });

    it('should handle empty object', () => {
        const result = withTemplateMetadataAll({});
        expect(Object.keys(result)).toHaveLength(0);
    });

    it('should filter out undefined values', () => {
        const partialFields: Partial<Record<string, DatasetField>> = {
            a: { id: 'id-a' },
            b: undefined
        };
        const result = withTemplateMetadataAll(partialFields);
        expect(result.a).toBeDefined();
        expect(result.b).toBeUndefined();
    });
});
