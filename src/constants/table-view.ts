import {
    ROW_INDEX_FIELD_NAME,
    SELECTED_ROW_FIELD_NAME
} from '@deneb-viz/powerbi-compat/dataset';

/**
 * List of reserved words for column headers that can benefit from specific
 * tooltips explaining their purpose
 */
export const TABLE_COLUMN_RESERVED_WORDS = [
    ROW_INDEX_FIELD_NAME,
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
