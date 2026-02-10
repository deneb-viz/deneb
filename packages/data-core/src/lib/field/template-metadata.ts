import type {
    DatasetField,
    DatasetFieldRole,
    UsermetaDatasetField,
    UsermetaDatasetFieldKind
} from './types';

/**
 * Maps a DatasetField role to the corresponding UsermetaDatasetField kind.
 * Used when transforming fields for export/json-processing boundary.
 *
 * @param role - The field role ('grouping' | 'aggregation')
 * @returns The corresponding kind ('column' | 'measure') or undefined if no role specified
 */
export const roleToKind = (
    role?: DatasetFieldRole
): UsermetaDatasetFieldKind | undefined => {
    if (role === 'aggregation') return 'measure';
    if (role === 'grouping') return 'column';
    return undefined;
};

/**
 * Maps a UsermetaDatasetField kind to the corresponding DatasetField role.
 * Used when importing templates to convert kind back to role.
 *
 * @param kind - The field kind ('column' | 'measure' | 'any')
 * @returns The corresponding role ('grouping' | 'aggregation') or undefined if 'any' or not specified
 */
export const kindToRole = (
    kind?: UsermetaDatasetFieldKind
): DatasetFieldRole | undefined => {
    if (kind === 'measure') return 'aggregation';
    if (kind === 'column') return 'grouping';
    return undefined;
};

/**
 * Options for transforming a DatasetField to UsermetaDatasetField.
 */
export type ToUsermetaDatasetFieldOptions = {
    /**
     * The placeholder key to use for this field (e.g., '__0__').
     * If not provided, the field's id will be used.
     */
    placeholder?: string;
};

/**
 * Transforms a DatasetField to a UsermetaDatasetField for use at the json-processing boundary.
 *
 * @param key - The record key (field name in Vega data)
 * @param field - The DatasetField to transform
 * @param options - Optional transformation options
 * @returns A UsermetaDatasetField suitable for export/tracking
 */
export const toUsermetaDatasetField = <T = object>(
    key: string,
    field: DatasetField<T>,
    options?: ToUsermetaDatasetFieldOptions
): UsermetaDatasetField => ({
    key: options?.placeholder ?? field.id ?? key,
    name: key,
    namePlaceholder: key,
    description: field.description ?? '',
    kind: roleToKind(field.role),
    type: field.dataType ?? 'other'
});

/**
 * Transforms an array of DatasetField entries to UsermetaDatasetFields with sequential placeholders.
 *
 * @param entries - Array of [key, field] entries to transform
 * @returns Array of UsermetaDatasetFields with placeholders __0__, __1__, etc.
 */
export const toUsermetaDatasetFields = <T = object>(
    entries: [string, DatasetField<T>][]
): UsermetaDatasetField[] =>
    entries.map(([key, field], i) =>
        toUsermetaDatasetField(key, field, { placeholder: `__${i}__` })
    );

/**
 * Represents a DatasetField with templateMetadata for backward compatibility with json-processing.
 * This type bridges the gap between the new DatasetField structure (without templateMetadata)
 * and the structure expected by json-processing workers.
 */
export type DatasetFieldWithTemplateMetadata<T = object> = DatasetField<T> & {
    templateMetadata: UsermetaDatasetField;
};

/**
 * Transforms a DatasetField to include templateMetadata for backward compatibility with json-processing.
 * This function is used at the boundary when passing fields to json-processing workers.
 *
 * @param key - The record key (field name in Vega data)
 * @param field - The DatasetField to transform
 * @returns A new object with the original field properties plus templateMetadata
 */
export const withTemplateMetadata = <T = object>(
    key: string,
    field: DatasetField<T>
): DatasetFieldWithTemplateMetadata<T> => ({
    ...field,
    templateMetadata: toUsermetaDatasetField(key, field)
});

/**
 * Transforms a DatasetFields object to include templateMetadata on each field for backward compatibility.
 * Handles partial records by filtering out undefined values.
 *
 * @param fields - The DatasetFields object to transform (may be partial)
 * @returns A new object with templateMetadata added to each field
 */
export const withTemplateMetadataAll = <T = object>(
    fields: Partial<Record<string, DatasetField<T>>> | Record<string, DatasetField<T>>
): Record<string, DatasetFieldWithTemplateMetadata<T>> =>
    Object.fromEntries(
        Object.entries(fields)
            .filter(
                (entry): entry is [string, DatasetField<T>] =>
                    entry[1] !== undefined
            )
            .map(([key, field]) => [key, withTemplateMetadata(key, field)])
    );
