/**
 * The name we wish to use for handling the Drilldown data role from the data view.
 */
export const DRILL_FIELD_NAME = '__drill__';

/**
 * Because Drilldown can be multi-level, and we don't know how many there are, we provide a special column which
 * concatenates and formats the supplied columns, which can be used like how core charts tend to do this.
 */
export const DRILL_FIELD_FLAT = DRILL_FIELD_NAME?.replace(/(__$)/, '_flat$1');

/**
 * For a measure, this is suffixed to the column name to denote the format string.
 */
export const FORMAT_FIELD_SUFFIX = '__format';

/**
 * For a measure, this is suffixed to the column name to denote the formatted value.
 */
export const FORMATTED_FIELD_SUFFIX = '__formatted';

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

/**
 * The name we use to denote a field in the dataset that holds a selection ID.
 */
export const ROW_IDENTITY_FIELD_NAME = '__identity__';

/**
 * The name we use to denote a row in the datset, which is also used for reconciliation of selectors.
 */
export const ROW_INDEX_FIELD_NAME = '__row__';

/**
 * The name we use to denote a field in the dataset used to hold the stringified representation of the identity, and
 * therefore use for comparison operations and suchlike.
 */
export const ROW_KEY_FIELD_NAME = '__key__';

/**
 * The name we use to denote a data point's selection status within the dataset.
 */
export const SELECTED_ROW_FIELD_NAME = '__selected__';
