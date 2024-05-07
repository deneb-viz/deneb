import { getLocation, JSONPath } from 'jsonc-parser';
import stringify from 'json-stringify-pretty-compact';
import * as ace from 'ace-builds';
import Ace = ace.Ace;
import Editor = Ace.Editor;
import Point = Ace.Point;
import { PROPERTIES_DEFAULTS } from '@deneb-viz/core-dependencies';

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
        maxLength: PROPERTIES_DEFAULTS.editor.maxLineLength,
        indent: '\u2800'
    });
