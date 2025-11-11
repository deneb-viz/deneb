import {
    ROW_IDENTITY_FIELD_NAME,
    ROW_INDEX_FIELD_NAME,
    ROW_KEY_FIELD_NAME,
    SELECTED_ROW_FIELD_NAME
} from '@deneb-viz/dataset/field';

/**
 * List of reserved words for column headers that can benefit from specific
 * tooltips explaining their purpose
 */
export const TABLE_COLUMN_RESERVED_WORDS = [
    ROW_IDENTITY_FIELD_NAME,
    ROW_INDEX_FIELD_NAME,
    ROW_KEY_FIELD_NAME,
    SELECTED_ROW_FIELD_NAME
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
