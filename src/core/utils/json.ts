import stringify from 'json-stringify-pretty-compact';

import { PROPERTY_DEFAULTS } from '../../../config';

type TIndentContext = 'editor' | 'tooltip';

/**
 * Performs a pretty-print of JSON object into a string. We will use a
 * different whitespace character depending on context (as tooltips need to be
 * exploited a bit).
 */
export const getJsonAsIndentedString = (
    json: object,
    context: TIndentContext = 'editor'
) =>
    stringify(json, {
        maxLength: PROPERTY_DEFAULTS.editor.maxLineLength,
        indent:
            (context === 'editor' && PROPERTY_DEFAULTS.editor.tabSize) ||
            '\u2800'
    });
