import stringify from 'json-stringify-pretty-compact';
import { PROPERTIES_DEFAULTS } from '@deneb-viz/core-dependencies';

/**
 * In order to create suitable output for tooltips and debugging tables.
 * Because Power BI tooltips suppress standard whitespace, we're substituting
 * a unicode character that is visually similar to a space, but is not caught
 * by the tooltip handler.
 */
export const getObjectFormattedAsText = (obj: object) =>
    stringify(obj, {
        maxLength: PROPERTIES_DEFAULTS.editor.maxLineLength,
        indent: '\u2800'
    });
