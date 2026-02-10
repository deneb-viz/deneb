import type { DatasetField, DatasetFields, DatasetFieldsInput } from './types';

/**
 * Normalize field input to the internal record format.
 * Converts array of strings to record with default template-eligible properties.
 *
 * When using array format, fields are assigned default values:
 * - `role: 'grouping'` - assumes categorical/grouping by default
 * - `dataType: 'other'` - generic type when unknown
 *
 * This ensures simple fields are eligible for template operations (export, tracking).
 *
 * @param input - Either an array of field names or a record of field definitions
 * @returns A normalized DatasetFields record
 *
 * @example
 * // Array input - gets template-eligible defaults
 * normalizeFieldsInput(['a', 'b'])
 * // Returns: { a: { role: 'grouping', dataType: 'other' }, b: { role: 'grouping', dataType: 'other' } }
 *
 * @example
 * // Record input (passthrough)
 * normalizeFieldsInput({ a: { role: 'aggregation' } })
 * // Returns: { a: { role: 'aggregation' } }
 */
export const normalizeFieldsInput = <T = object>(
    input: DatasetFieldsInput<T> | undefined
): DatasetFields<T> => {
    if (!input) return {};

    // Already a record - return as-is
    if (!Array.isArray(input)) return input;

    // Convert array of strings to record with template-eligible defaults
    return input.reduce<DatasetFields<T>>((acc, fieldName) => {
        acc[fieldName] = {
            role: 'grouping',
            dataType: 'other'
        } as DatasetField<T>;
        return acc;
    }, {});
};

/**
 * Enrich existing fields with new metadata, preserving what already exists.
 * New metadata only overwrites properties that are undefined in the existing field.
 *
 * @param existingFields - The current field definitions
 * @param enrichment - Partial field definitions to merge in
 * @returns A new DatasetFields object with merged properties
 *
 * @example
 * enrichFields(
 *     { a: { role: 'grouping' } },
 *     { a: { dataType: 'text' } }
 * )
 * // Returns: { a: { role: 'grouping', dataType: 'text' } }
 */
export const enrichFields = <T = object>(
    existingFields: DatasetFields<T>,
    enrichment: Partial<Record<string, Partial<DatasetField<T>>>>
): DatasetFields<T> => {
    return Object.fromEntries(
        Object.entries(existingFields).map(([key, field]) => {
            const newData = enrichment[key];
            if (!newData) return [key, field];

            // Merge: existing properties take precedence unless undefined
            return [
                key,
                {
                    ...field,
                    // Only apply enrichment for properties not already set
                    role: field.role ?? newData.role,
                    dataType: field.dataType ?? newData.dataType,
                    description: field.description ?? newData.description,
                    id: field.id ?? newData.id
                }
            ];
        })
    ) as DatasetFields<T>;
};
