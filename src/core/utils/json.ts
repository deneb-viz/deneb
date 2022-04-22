import stringify from 'json-stringify-pretty-compact';

import { getConfig } from '../../core/utils/config';
import { TABLE_VALUE_MAX_DEPTH } from '../../constants';
import { i18nValue } from '../ui/i18n';

type TIndentContext = 'editor' | 'tooltip';

/**
 * Intended to be used as a substitute for `JSON.parse`; will ensure that any
 * supplied `content` is sanitised for URLs (if blocking them) prior to a
 * regular parse. The optional `fallback` allows the caller to provide a
 * default to provide if the parse fails (will return empty object (`{}`) if
 * not supplied).
 */
export const cleanParse = (content: string, fallback?: string): Object => {
    try {
        return JSON.parse(content);
    } catch {
        return JSON.parse(fallback || '{}');
    }
};

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
        maxLength: getConfig().propertyDefaults.editor.maxLineLength,
        indent:
            (context === 'editor' &&
                getConfig().propertyDefaults.editor.tabSize) ||
            '\u2800'
    });

/**
 * Create a sringified representation of an object, pruned at a specified
 * level of depth.
 */
export const stringifyPruned = (
    json: Object,
    maxDepth = TABLE_VALUE_MAX_DEPTH
) => JSON.stringify(json, prune(maxDepth));

/**
 * For a given object, prune at the specified level of depth. Borrowed and
 * adapted from vega-tooltip.
 */
const prune = (obj: Object, maxDepth = TABLE_VALUE_MAX_DEPTH) => {
    const stack: any[] = [];
    return function (this: any, key: string, value: any) {
        if (typeof value !== 'object' || value === null) {
            return value;
        }
        const pos = stack.indexOf(this) + 1;
        stack.length = pos;
        if (stack.length > maxDepth) {
            return i18nValue('Table_Placeholder_Object');
        }
        if (stack.indexOf(value) >= 0) {
            return i18nValue('Table_Placeholder_Circular');
        }
        stack.push(value);
        return value;
    };
};
