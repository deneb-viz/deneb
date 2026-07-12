import {
    applyEdits,
    format,
    getNodeValue,
    modify,
    parseTree,
    Node
} from 'jsonc-parser';
import { JSONPath } from 'vscode-json-languageservice';
import { stripJsoncComments } from '@deneb-viz/utils/jsonc';

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
    replaceCh?: string
) => stripJsoncComments(content, replaceCh);

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
