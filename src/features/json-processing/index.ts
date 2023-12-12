import {
    getLanguageService,
    TextDocument,
    Position
} from 'vscode-json-languageservice';
import {
    findNodeAtLocation,
    JSONPath,
    parseTree,
    stripComments
} from 'jsonc-parser';

import cloneDeep from 'lodash/cloneDeep';
import * as ace from 'ace-builds';
import Ace = ace.Ace;
import Point = Ace.Point;

import { TABLE_VALUE_MAX_DEPTH } from '../../constants';
import { getI18nValue } from '../i18n';
import { logDebug, logTimeEnd, logTimeStart } from '../logging';
import { IContentParseResult } from '../specification';

export {
    getObjectFormattedAsText,
    getTextFormattedAsJsonC
} from './formatting';

/**
 * 'Filename' to use for validating editor JSON content using language services.
 */
export const JSON_INTERNAL_CONTENT_URI = 'deneb://spec.json';

/**
 * URI/namespace to use for establishing language services for an editor spec.
 */
export const JSON_INTERNAL_SCHEMA_URI = 'deneb://schema.json';

/**
 * When resolving JSON to readable strings, this is the default maximum level
 * of depth to stop at.
 */
export const JSON_MAX_PRUNE_DEPTH = 3;

/**
 * Convert an Ace `Point` to a VS Code `Position`, for resolving content using
 * the language services.
 */
export const getEditorPointToPosition = (point: Point): Position => ({
    line: point.row,
    character: point.column
});

/**
 * For the supplied schema, generate a VS Code `LanguageService` that can be
 * used for autocompletion and hover events.
 */
export const getJsonLanguageService = (schema: any) => {
    const ls = getLanguageService({
        schemaRequestService: () => Promise.resolve(JSON.stringify(schema))
    });
    ls.configure({
        allowComments: false,
        schemas: [{ fileMatch: ['*.json'], uri: JSON_INTERNAL_SCHEMA_URI }]
    });
    return ls;
};

/**
 * For the supplied content and path, return the JSON node at that location.
 */
export const getJsonLocationAtPath = (content: string, path: JSONPath) => {
    return findNodeAtLocation(parseTree(content), path);
};

/**
 * For editor JSON, process it to remove any potential comments, and therefor
 * make it a parsable JSON string. By default, we will replace any comment
 * data with spaces, so that the line numbers remain the same. This can be
 * overridden by specifying a different replacement character.
 */
export const getJsonPure = (content: string, replaceCh: string = ' ') =>
    stripComments(content || '{}', replaceCh);

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
 * Intended to be used as a substitute for `JSON.parse`; will ensure that any
 * supplied `content` is tested as .
 */
export const parseAndValidateContentJson = (
    content: string,
    fallback?: string
): IContentParseResult => {
    try {
        return { result: JSON.parse(getJsonPure(content)), errors: [] };
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
