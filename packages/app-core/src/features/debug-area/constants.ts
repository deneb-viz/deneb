/**
 * Font family to use for data table. We use a monospace font, to be able to guarantee that display width can be
 * reliably predicated without having to spam a canvas renderer for every field and value and saves us a significant
 * amount of time and resource.
 */
export const DATA_TABLE_FONT_FAMILY = 'Consolas, "Courier New", monospace';

/**
 * Font size for the data table display.
 */
export const DATA_TABLE_FONT_SIZE = 12;

/**
 * The height of a single row in the data table.
 */
export const DATA_TABLE_ROW_HEIGHT = 24;

/**
 * The padding to apply to the left of a table row.
 */
export const DATA_TABLE_ROW_PADDING_LEFT = 10;

/**
 * The maximum level of recursion to use when evaluating a table value (in case it's a complex object).
 */
export const DATA_TABLE_VALUE_MAX_DEPTH = 3;

/**
 * The maximum permitted length of a value for a table cell before 'truncating' it for display.
 */
export const DATA_TABLE_VALUE_MAX_LENGTH = 250;
