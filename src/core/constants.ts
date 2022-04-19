import { dataRoles } from '../../capabilities.json';

/**
 * The name to use for the dataset in Deneb, bound from the data view, into the
 * Vega view as a named reference.
 */
export const DATASET_NAME = dataRoles[0].name;

/**
 * The name we use to denote a row in the datset, which is also used for
 * reconciliation of selectors.
 */
export const DATASET_ROW_NAME = '__row__';

/**
 * The name we use to denote a field in the dataset that holds a selection ID
 */
export const DATASET_IDENTITY_NAME = '__identity__';

/**
 * The name we use to denote a field in the dataset used to hold the string-
 * ified representation of the identity, and therefore use for comparison
 * operations and suchlike.
 */
export const DATASET_KEY_NAME = '__key__';

/***
 * The name we use to denote a data point's selection status within the
 * dataset.
 */
export const DATASET_SELECTED_NAME = '__selected__';

/**
 * List of reserved words for column headers that can benefit from specific
 * tooltips explaining their purpose
 */
export const TABLE_COLUMN_RESERVED_WORDS = [
    DATASET_ROW_NAME,
    DATASET_IDENTITY_NAME,
    DATASET_KEY_NAME,
    DATASET_SELECTED_NAME
];

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

/**
 * The maximum level of recursion to use when evaluating a table value (in case
 * it's a complex object.
 */
export const TABLE_VALUE_MAX_DEPTH = 3;

/**
 * The maximum permitted length of a value for a table cell before 'truncating'
 * it for display.
 */
export const TABLE_VALUE_MAX_LENGTH = 250;
