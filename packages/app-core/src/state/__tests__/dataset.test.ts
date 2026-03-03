import { describe, expect, it } from 'vitest';
import { type UsermetaDatasetField } from '@deneb-viz/data-core/field';
import { reconcileExportDatasetFields } from '../dataset';

/**
 * Helper to create a minimal UsermetaDatasetField for testing.
 */
const field = (
    key: string,
    name: string,
    overrides?: Partial<UsermetaDatasetField>
): UsermetaDatasetField => ({
    key,
    name,
    namePlaceholder: name,
    type: 'text',
    ...overrides
});

describe('reconcileExportDatasetFields', () => {
    it('should return fresh fields as-is when previousFields is undefined', () => {
        const fresh = [field('__0__', 'Category'), field('__1__', 'Sales')];
        const result = reconcileExportDatasetFields(fresh, undefined);
        expect(result).toEqual(fresh);
    });

    it('should return fresh fields as-is when previousFields is empty', () => {
        const fresh = [field('__0__', 'Category'), field('__1__', 'Sales')];
        const result = reconcileExportDatasetFields(fresh, []);
        expect(result).toEqual(fresh);
    });

    it('should preserve metadata when fields are in the same order', () => {
        const fresh = [field('__0__', 'Category'), field('__1__', 'Sales')];
        const previous = [
            field('__0__', 'Category', {
                description: 'Product category',
                kind: 'column',
                suppliedObjectKey: 'qn-cat',
                suppliedObjectName: 'Category'
            }),
            field('__1__', 'Sales', {
                description: 'Total sales',
                kind: 'measure',
                suppliedObjectKey: 'qn-sales',
                suppliedObjectName: 'Sales'
            })
        ];
        const result = reconcileExportDatasetFields(fresh, previous);
        expect(result[0].description).toBe('Product category');
        expect(result[0].kind).toBe('column');
        expect(result[0].suppliedObjectKey).toBe('qn-cat');
        expect(result[1].description).toBe('Total sales');
        expect(result[1].kind).toBe('measure');
        expect(result[1].suppliedObjectKey).toBe('qn-sales');
    });

    it('should preserve metadata when fields are reordered', () => {
        // Fresh fields: Sales is now first (__0__), Category is second (__1__)
        const fresh = [field('__0__', 'Sales'), field('__1__', 'Category')];
        const previous = [
            field('__0__', 'Category', {
                description: 'Product category',
                kind: 'column'
            }),
            field('__1__', 'Sales', {
                description: 'Total sales',
                kind: 'measure'
            })
        ];
        const result = reconcileExportDatasetFields(fresh, previous);
        // Sales (now __0__) should get Sales metadata, not Category metadata
        expect(result[0].namePlaceholder).toBe('Sales');
        expect(result[0].description).toBe('Total sales');
        expect(result[0].kind).toBe('measure');
        expect(result[0].key).toBe('__0__');
        // Category (now __1__) should get Category metadata
        expect(result[1].namePlaceholder).toBe('Category');
        expect(result[1].description).toBe('Product category');
        expect(result[1].kind).toBe('column');
        expect(result[1].key).toBe('__1__');
    });

    it('should update positional key when fields are reordered', () => {
        const fresh = [field('__0__', 'Sales'), field('__1__', 'Category')];
        const previous = [
            field('__0__', 'Category', { description: 'Cat desc' }),
            field('__1__', 'Sales', { description: 'Sales desc' })
        ];
        const result = reconcileExportDatasetFields(fresh, previous);
        // Key should reflect NEW position, not the old one
        expect(result[0].key).toBe('__0__');
        expect(result[1].key).toBe('__1__');
    });

    it('should handle a field removed from the middle', () => {
        // Previously had 3 fields; middle field (Price) removed
        const fresh = [field('__0__', 'Category'), field('__1__', 'Sales')];
        const previous = [
            field('__0__', 'Category', { description: 'Cat desc' }),
            field('__1__', 'Price', { description: 'Price desc' }),
            field('__2__', 'Sales', { description: 'Sales desc' })
        ];
        const result = reconcileExportDatasetFields(fresh, previous);
        expect(result).toHaveLength(2);
        expect(result[0].description).toBe('Cat desc');
        expect(result[0].key).toBe('__0__');
        // Sales keeps its metadata despite shifting from position 2 to 1
        expect(result[1].description).toBe('Sales desc');
        expect(result[1].key).toBe('__1__');
    });

    it('should handle a new field added at the end', () => {
        const fresh = [
            field('__0__', 'Category'),
            field('__1__', 'Sales'),
            field('__2__', 'Profit')
        ];
        const previous = [
            field('__0__', 'Category', { description: 'Cat desc' }),
            field('__1__', 'Sales', { description: 'Sales desc' })
        ];
        const result = reconcileExportDatasetFields(fresh, previous);
        expect(result[0].description).toBe('Cat desc');
        expect(result[1].description).toBe('Sales desc');
        // New field gets default (no description)
        expect(result[2].description).toBeUndefined();
        expect(result[2].namePlaceholder).toBe('Profit');
        expect(result[2].key).toBe('__2__');
    });

    it('should fall back to name when previous entries lack namePlaceholder', () => {
        const fresh = [field('__0__', 'Category'), field('__1__', 'Sales')];
        const previous: UsermetaDatasetField[] = [
            {
                key: '__0__',
                name: 'Category',
                type: 'text',
                description: 'Cat desc from import'
            },
            {
                key: '__1__',
                name: 'Sales',
                type: 'numeric',
                description: 'Sales desc from import',
                kind: 'measure'
            }
        ];
        const result = reconcileExportDatasetFields(fresh, previous);
        expect(result[0].description).toBe('Cat desc from import');
        expect(result[1].description).toBe('Sales desc from import');
        expect(result[1].kind).toBe('measure');
        // Fresh namePlaceholder and key should be applied
        expect(result[0].namePlaceholder).toBe('Category');
        expect(result[1].namePlaceholder).toBe('Sales');
    });

    it('should refresh name and namePlaceholder from fresh fields', () => {
        const fresh = [field('__0__', 'Category')];
        const previous = [
            field('__0__', 'Category', {
                name: 'Old Name',
                namePlaceholder: 'Category',
                description: 'Kept'
            })
        ];
        const result = reconcileExportDatasetFields(fresh, previous);
        expect(result[0].name).toBe('Category');
        expect(result[0].namePlaceholder).toBe('Category');
        expect(result[0].description).toBe('Kept');
    });
});
