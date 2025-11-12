import {
    applyEdits,
    format,
    getNodeValue,
    modify,
    parseTree,
    stripComments,
    Node
} from 'jsonc-parser';
import { JSONPath } from 'vscode-json-languageservice';
import { type IJsonParseResult } from './lib/spec-processing';

/**
 * When converting JSONC to JSON, this is the character to replace comments with.
 */
const JSONC_TO_JSON_COMMENT_REPLACE_CHAR = ' ';

/**
 * For the supplied JSONC tree, return the JavaScript object value of the node.
 * @privateRemarks
 * This is intended to serve as a wrapper for the JSONC library method, so that we can add our own additional logic
 * and/or error handling as needed.
 */
// istanbul ignore next
export const getJsoncNodeValue = (tree: Node) => getNodeValue(tree);

/**
 * For the content (which may contain comments), get this parsed as a simple object. If the content cannot be parsed,
 * this will be `null`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getJsoncStringAsObject = (content: string): any => {
    try {
        return JSON.parse(getJsonPureString(content));
    } catch {
        return null;
    }
};

/**
 * For the supplied content, return it as a parsed JSONC tree.
 * @privateRemarks
 * This is intended to serve as a wrapper for the JSONC library method, so that we can add our own additional logic
 * and/or error handling as needed.
 */
// istanbul ignore next
export const getJsoncTree = (content: string) => parseTree(content) as Node;

/**
 * For editor JSON, process it to remove any potential comments, and therefore make it a parsable JSON string. By
 * default, we will replace any comment data with spaces, so that the line numbers remain the same. This can be
 * overridden by specifying a different replacement character.
 */
export const getJsonPureString = (
    content: string | undefined | null,
    replaceCh: string = JSONC_TO_JSON_COMMENT_REPLACE_CHAR
) => stripComments(content || '{}', replaceCh);

/**
 * For the supplied content, JSONPath, and value, return the modified JSONC string as of that location.
 */
export const getModifiedJsoncByPath = (
    content: string,
    path: JSONPath,
    value: unknown
) => {
    const edits = modify(content, path, value, {});
    return applyEdits(content, edits);
};

/**
 * Intended to be used as a substitute for `JSON.parse`; will ensure that any supplied `content` is tested as JSONC.
 * Any parsing issues are included in the returned `errors` array.
 */
export const getParsedJsonWithResult = (
    content: string,
    fallback?: string
): IJsonParseResult => {
    try {
        return { result: JSON.parse(getJsonPureString(content)), errors: [] };
    } catch (e: unknown) {
        if (!fallback) return { result: null, errors: [(<Error>e).message] };
        return { result: JSON.parse(fallback), errors: [] };
    }
};

/**
 * For editor and template content, we will need to potentially handle JSONC if we want to format it. This method uses
 * the JSON-C parser to get suitable output for the editor and generating template output.
 *
 * @privateRemarks for cases where we want to generate stringified output for objects, such as for tooltips and
 * debugging tables, {@link getObjectFormattedAsText} should be used instead. This doesn't have as much overhead and is
 * better for cases where we need to process many objects.
 */
export const getTextFormattedAsJsonC = (content: string, tabSize: number) => {
    const formatted = format(content, undefined, {
        tabSize,
        insertSpaces: true
    });
    return applyEdits(content, formatted);
};
