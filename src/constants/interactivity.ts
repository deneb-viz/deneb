/**
 * Denotes the name of the dataset that contains the cross filter state.
 */
export const CROSS_FILTER_STATE_DATASET_NAME = 'dataset_cross_filter_context';

/**
 * Denotes how we suffix fields in the dataset that contain highlight values.
 */
export const HIGHLIGHT_FIELD_SUFFIX = '__highlight';

/**
 * Denotes how we suffix fields that contain the status of a highlight value,
 * which can be used for conditional checks without resorting to more complex
 * expressions than necessary.
 */
export const HIGHLIGHT_STATUS_SUFFIX = `${HIGHLIGHT_FIELD_SUFFIX}Status`;

/**
 * Denotes how we suffix fields that contain thew comparison of a highlight
 * value to its original value, which can be used for conditional checks
 * without resorting to more complex expressions than necessary.
 */
export const HIGHLIGHT_COMPARATOR_SUFFIX = `${HIGHLIGHT_FIELD_SUFFIX}Comparator`;
