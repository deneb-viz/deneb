/**
 * Metadata for dataset fields. This is based on the Power BI metadata and is enriched with other properties that we
 * need for Deneb.
 */
export type DatasetField<T = object> = {
    /**
     * Unique identifier for the field within the dataset
     */
    id: string;
    /**
     * The display/friendly name of the field. Can be set to the same as the `id` if needed.
     */
    name: string;
    /**
     * Host-specific metadata that can be attached to the field for use by the host application and applied during
     * dataset construction.
     */
    hostMetadata?: T;
    /**
     * Representation of the field for templating purposes. Should only be present if the field is eligible for use
     * within templates. Anything else is assumed to be a support field.
     */
    templateMetadata?: UsermetaDatasetField;
};

/**
 * Field metadata that we wish to expose to the dataset; flexible keys.
 */
export type DatasetFields<T = object> = {
    [key: string]: DatasetField<T>;
};

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
     */
    kind: UsermetaDatasetFieldKind;
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
 */
export type UsermetaDatasetFieldType =
    | 'bool'
    | 'text'
    | 'numeric'
    | 'dateTime'
    | 'other';
