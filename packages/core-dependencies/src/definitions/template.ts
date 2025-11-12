/**
 * Used to manage regex match/replace for portions of a template that represent fields from the dataset.
 */
export type DenebTemplateDataFieldReplacerPattern = {
    match: string;
    replacer: string;
};

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
