/**
 * Denotes the role that a column performs, allowing us to switch based on this value.
 */
export type DenebTemplateDatasetColumnRole =
    | 'type'
    | 'name'
    | 'assignment'
    | 'description'
    | 'originalName'
    | 'exportName'
    | 'exportDescription';
