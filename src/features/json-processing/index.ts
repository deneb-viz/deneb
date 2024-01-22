import { Position } from 'vscode-json-languageservice';

import cloneDeep from 'lodash/cloneDeep';
import * as ace from 'ace-builds';
import Ace = ace.Ace;
import Point = Ace.Point;

import { getI18nValue } from '../i18n';
import { logDebug, logTimeEnd, logTimeStart } from '../logging';
import { IContentParseResult } from '../specification';
import { JSON_MAX_PRUNE_DEPTH, getJsonPureString } from '@deneb-viz/json';

export {
    getObjectFormattedAsText,
    getTextFormattedAsJsonC
} from './formatting';
export { getJsonDocumentValidation } from './validation';

/**
 * Convert an Ace `Point` to a VS Code `Position`, for resolving content using
 * the language services.
 */
export const getEditorPointToPosition = (point: Point): Position => ({
    line: point.row,
    character: point.column
});

/**
 * Prune an object at a specified level of depth.
 */
export const getPrunedObject = (
    json: object,
    maxDepth = JSON_MAX_PRUNE_DEPTH
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
 * Intended to be used as a substitute for `JSON.parse`; will ensure that any
 * supplied `content` is tested as .
 */
export const parseAndValidateContentJson = (
    content: string,
    fallback?: string
): IContentParseResult => {
    try {
        return { result: JSON.parse(getJsonPureString(content)), errors: [] };
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
 * Create a stringified representation of an object, pruned at a specified
 * level of depth.
 */
export const stringifyPruned = (
    json: object,
    maxDepth = JSON_MAX_PRUNE_DEPTH
) => JSON.stringify(json, prune(maxDepth));

/**
 * For a given object, prune at the specified level of depth. Borrowed and
 * adapted from vega-tooltip.
 */
const prune = (maxDepth = JSON_MAX_PRUNE_DEPTH) => {
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
