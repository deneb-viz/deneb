/**
 * The role of a field in the dataset - either for grouping (categorical) or aggregation (numeric measures).
 */
export type DatasetFieldRole = 'grouping' | 'aggregation';

/**
 * The data type of a field in the dataset.
 */
export type DatasetFieldDataType =
    | 'bool'
    | 'text'
    | 'numeric'
    | 'dateTime'
    | 'other';

/**
 * Metadata for dataset fields. This is based on the Power BI metadata and is enriched with other properties that we
 * need for Deneb.
 *
 * The record key in DatasetFields serves as the field's "name" - i.e., the column name in Vega data.
 * The `id` property is optional and only needed when it differs from the record key (e.g., Power BI queryName).
 */
export type DatasetField<T = object> = {
    /**
     * Unique identifier for the field within the dataset.
     * Optional - defaults to the record key if not provided.
     * Use this when the identifier differs from the record key (e.g., Power BI queryName).
     */
    id?: string;
    /**
     * The role of this field - 'grouping' for categorical fields or 'aggregation' for measures.
     * Optional - defaults to 'grouping' when not specified.
     */
    role?: DatasetFieldRole;
    /**
     * The data type of this field. Optional - defaults to 'other' when not specified.
     */
    dataType?: DatasetFieldDataType;
    /**
     * Optional description for the field, used in template exports.
     */
    description?: string;
    /**
     * Host-specific metadata that can be attached to the field for use by the host application and applied during
     * dataset construction.
     */
    hostMetadata?: T;
};

/**
 * Field metadata that we wish to expose to the dataset; flexible keys.
 */
export type DatasetFields<T = object> = {
    [key: string]: DatasetField<T>;
};

/**
 * Input type for field definitions - supports both simple array format and full record format.
 * Arrays are normalized to records internally.
 *
 * @example
 * // Simple format - just field names
 * fields: ['a', 'b', 'c']
 *
 * @example
 * // Full format - with metadata
 * fields: {
 *     a: { role: 'grouping', dataType: 'text' },
 *     b: { role: 'aggregation', dataType: 'numeric' }
 * }
 */
export type DatasetFieldsInput<T = object> =
    | string[]
    | DatasetFields<T>;

/**
 * When we parse the JSON to look for specific field types, these rely on specific patterns and replacements. This
 * interface provides the pattern and the replacement for a given field type.
 */
export type FieldPatternReplacer = {
    pattern: string;
    replacer: string;
};

/**
 * Definitions for individual fields within the dataset.
 */
export type UsermetaDatasetField = {
    /**
     * Unique field placeholder name. Must start and end with __ (double-underscore) and can only use alpha-numeric
     * characters in-between.
     * @pattern ^__[a-zA-Z0-9]+__$
     * @maxLength 30
     */
    key: string;
    /**
     * The display name of the field when presenting the template to the end user.
     * @maxLength 150
     */
    name: string;
    /**
     * Optional assistive text to display to the end-user when adding fields to the template.
     * @maxLength 300
     */
    description?: string;
    /**
     * Specifies whether a column or measure (or either) should be used for this placeholder.
     * Optional - purely informational, not used for filtering during import.
     */
    kind?: UsermetaDatasetFieldKind;
    /**
     * The list of data types that can be used for this placeholder, for any columns or measures in the data model.
     */
    type: UsermetaDatasetFieldType;
    /**
     * Used internally by Deneb for import reconcilitation purposes once user supplies object from their own visual via
     * the UI. This is the `queryName` of a supplied field from the data view.
     * @ignore
     */
    suppliedObjectKey?: string;
    /**
     * Used internally by Deneb for import reconcilitation purposes once user supplies object from their own visual via
     * the UI. This is the `displayName` of a supplied field from the data view.
     * @ignore
     */
    suppliedObjectName?: string;
    /**
     * Used internally by Deneb for export reconcilitation purposes.
     * @ignore
     */
    namePlaceholder?: string;
};

/**
 * The type of field that should ideally be applied to a placeholder.
 */
export type UsermetaDatasetFieldKind = 'column' | 'measure' | 'any';

/**
 * The list of data types that can be used for this placeholder, for any columns or measures in the data model.
 * Alias for DatasetFieldDataType to ensure consistency between internal and export formats.
 */
export type UsermetaDatasetFieldType = DatasetFieldDataType;
