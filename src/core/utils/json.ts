import stringify from 'json-stringify-pretty-compact';
import cloneDeep from 'lodash/cloneDeep';

import { TABLE_VALUE_MAX_DEPTH } from '../../constants';
import { logDebug, logTimeEnd, logTimeStart } from '../../features/logging';
import { IContentParseResult } from '../../features/specification';
import { getI18nValue } from '../../features/i18n';
import { PROPERTY_DEFAULTS } from '../../../config';

type TIndentContext = 'editor' | 'tooltip';

/**
 * Intended to be used as a substitute for `JSON.parse`; will ensure that any
 * supplied `content` is tested as .
 */
export const parseAndValidateContentJson = (
    content: string,
    fallback?: string
): IContentParseResult => {
    try {
        return { result: JSON.parse(content), errors: [] };
    } catch (e) {
        logDebug(
            'parseAndValidateContentJson: error encountered when parsing. Returning fallback...',
            { fallback }
        );
        if (!fallback) return { result: null, errors: [e.message] };
        return { result: JSON.parse(fallback), errors: [] };
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
        maxLength: PROPERTY_DEFAULTS.editor.maxLineLength,
        indent:
            (context === 'editor' && PROPERTY_DEFAULTS.editor.tabSize) ||
            '\u2800'
    });

/**
 * Prune an object at a specified level of depth.
 */
export const getPrunedObject = (
    json: object,
    maxDepth = TABLE_VALUE_MAX_DEPTH
) => {
    logTimeStart('getPrunedObject clone');
    const newObj = cloneDeep(json);
    logTimeEnd('getPrunedObject clone');
    logTimeStart('getPrunedObject prune');
    const pruned = JSON.parse(stringifyPruned(newObj, maxDepth));
    logTimeEnd('getPrunedObject prune');
    return pruned;
};

/**
 * Create a stringified representation of an object, pruned at a specified
 * level of depth.
 */
export const stringifyPruned = (
    json: object,
    maxDepth = TABLE_VALUE_MAX_DEPTH
) => JSON.stringify(json, prune(maxDepth));

/**
 * For a given object, prune at the specified level of depth. Borrowed and
 * adapted from vega-tooltip.
 */
const prune = (maxDepth = TABLE_VALUE_MAX_DEPTH) => {
    const stack: any[] = [];
    return function (this: any, key: string, value: any) {
        if (value === undefined) {
            return 'undefined';
        }
        if (value === null) {
            return 'null';
        }
        if (typeof value !== 'object') {
            return value;
        }
        const pos = stack.indexOf(this) + 1;
        stack.length = pos;
        /**
         * We're hitting memory limits when we try to stringify the dataflow,
         * as it contains the scenegraph (#352). We manually remove this from
         * our object to avoid this.
         */
        if (key === 'dataflow') {
            delete value._scenegraph;
        }
        if (stack.length > maxDepth) {
            return getI18nValue('Table_Placeholder_Object');
        }
        if (stack.indexOf(value) >= 0) {
            return getI18nValue('Table_Placeholder_Circular');
        }
        stack.push(value);
        return value;
    };
};
