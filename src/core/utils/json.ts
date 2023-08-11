import stringify from 'json-stringify-pretty-compact';
import { stringify as prune } from 'vega-tooltip';

import { getConfig } from '../../core/utils/config';
import { TABLE_VALUE_MAX_DEPTH } from '../../constants';
import { logDebug } from '../../features/logging';
import { IContentParseResult } from '../../features/specification';

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
        maxLength: getConfig().propertyDefaults.editor.maxLineLength,
        indent:
            (context === 'editor' &&
                getConfig().propertyDefaults.editor.tabSize) ||
            '\u2800'
    });

/**
 * Prune an object at a specified level of depth.
 */
export const getPrunedObject = (
    json: object,
    maxDepth = TABLE_VALUE_MAX_DEPTH
) => JSON.parse(prune(json, maxDepth));

/**
 * Create a stringified representation of an object, pruned at a specified
 * level of depth.
 */
export const stringifyPruned = (
    json: object,
    maxDepth = TABLE_VALUE_MAX_DEPTH
) => prune(json, maxDepth);
