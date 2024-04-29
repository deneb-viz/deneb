/**
 * For a measure, this is suffixed to the column name to denote the format string.
 */
export const DATASET_FIELD_FORMAT_STRING_SUFFIX = '__format';

/**
 * For a measure, this is suffixed to the column name to denote the formatted value.
 */
export const DATASET_FIELD_FORMATED_VALUE_SUFFIX = '__formatted';

/**
 * Denotes how we suffix fields in the dataset that contain highlight values.
 */
export const HIGHLIGHT_FIELD_SUFFIX = '__highlight';

/**
 * Denotes how we suffix fields that contain the status of a highlight value, which can be used for conditional checks
 * without resorting to more complex expressions than necessary.
 */
export const HIGHLIGHT_STATUS_SUFFIX = `${HIGHLIGHT_FIELD_SUFFIX}Status`;

/**
 * Denotes how we suffix fields that contain the comparison of a highlight value to its original value, which can be
 * used for conditional checks without resorting to more complex expressions than necessary.
 */
export const HIGHLIGHT_COMPARATOR_SUFFIX = `${HIGHLIGHT_FIELD_SUFFIX}Comparator`;
