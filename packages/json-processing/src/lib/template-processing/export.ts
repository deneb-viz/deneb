import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';

/**
 * Gets the appropriate field name for export, prioritizing entered name (if present) over the placeholder.
 */
export const getFieldNameForExport = (field: UsermetaDatasetField): string => {
    return field.name || field.namePlaceholder || '';
};
