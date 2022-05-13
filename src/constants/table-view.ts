import {
    DATASET_ROW_NAME,
    DATASET_IDENTITY_NAME,
    DATASET_KEY_NAME,
    DATASET_SELECTED_NAME
} from './dataset';

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
 * The maximum level of recursion to use when evaluating a table value (in case
 * it's a complex object.
 */
export const TABLE_VALUE_MAX_DEPTH = 3;

/**
 * The maximum permitted length of a value for a table cell before 'truncating'
 * it for display.
 */
export const TABLE_VALUE_MAX_LENGTH = 150;
