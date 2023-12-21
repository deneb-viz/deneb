import { applyEdits, format, getLocation, JSONPath } from 'jsonc-parser';
import stringify from 'json-stringify-pretty-compact';
import * as ace from 'ace-builds';
import Ace = ace.Ace;
import Editor = Ace.Editor;
import Point = Ace.Point;

import { PROPERTY_DEFAULTS } from '../../../config';

/**
 * For the supplied editor, resolve the JSONPath, according to where the cursor
 * is currently positioned. Sometimes this results in an empty string for the
 * final element, which causes issues resolving the path later on, so this is
 * removed as a 'best effort' to ensure that we have something nearby.
 */
export const getJsonPathAtLocation = (
    editor: Editor,
    position?: Point
): JSONPath => {
    const textToCursor = editor?.session?.doc?.positionToIndex(
        position || editor?.getCursorPosition()
    );
    const location = getLocation(editor?.getValue() || '', textToCursor);
    return (
        location?.path?.slice(
            0,
            location.path.at(-1) == '' ? -1 : location.path.length
        ) || []
    );
};

/**
 * In order to create suitable output for tooltips and debugging tables.
 * Because Power BI tooltips suppress standard whitespace, we're substituting
 * a unicode character that is visually similar to a space, but is not caught
 * by the tooltip handler.
 */
export const getObjectFormattedAsText = (obj: object) =>
    stringify(obj, {
        maxLength: PROPERTY_DEFAULTS.editor.maxLineLength,
        indent: '\u2800'
    });

/**
 * For editor and template content, we will need to potentially handle JSON-C
 * if we want to format it. This method uses the JSON-C parser to get suitable
 * output for the editor and generating template output.
 *
 * @privateRemarks for cases where we want to generate stringified output for
 * objects, such as for tooltips and debugging tables, {@link getObjectFormattedAsText}
 * should be used instead. This doesn't have as much overhead and is better for
 * cases where we need to process many objects.
 */
export const getTextFormattedAsJsonC = (content: string, tabSize: number) => {
    const formatted = format(content, undefined, {
        tabSize,
        insertSpaces: true
    });
    return applyEdits(content, formatted);
};
