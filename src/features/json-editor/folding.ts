import * as ace from 'ace-builds';
import Ace = ace.Ace;
import Editor = Ace.Editor;
import Fold = Ace.Fold;
import Point = Ace.Point;

import { IEditorFoldPosition } from './types';
import { logDebug } from '../logging';
import { getJsonPathAtLocation } from '../json-processing/formatting';

/**
 * Get all folds from the editor, process them into a flattened array, and
 * sort them in descending order of level. This is so that when we restore
 * them, they are toggled from the lowest level to the top.
 */
export const getEditorFolds = (editor: Editor) => {
    const folds: Fold[] = editor?.session?.getAllFolds() || [];
    if (!editor) return [];
    return getEditorFoldsRecursive(editor, folds).sort(
        (a, b) => b.level - a.level
    );
};

/**
 * Traverse the fold tree and return a list of all folds in the tree as a
 * flattened array. We also get the JSONPAth for each node for use when we need
 * to restore the folds later on.
 */
const getEditorFoldsRecursive = (
    editor: Editor,
    folds: Fold[],
    refLine = 0,
    level = 0
) => {
    logDebug('getRecursiveFolds', { folds, refLine, level });
    const flat: IEditorFoldPosition[] = [];
    folds.forEach((fold) => {
        const point = {
            row: fold.start.row + refLine,
            column: fold.start.column
        };
        const path = getJsonPathAtLocation(editor, point);
        flat.push({
            level,
            point,
            path
        });
        flat.push(
            ...getEditorFoldsRecursive(
                editor,
                fold.subFolds,
                refLine + fold.start.row,
                level + 1
            )
        );
    });
    return flat;
};

/**
 * Toggle the supplied folds in the editor.
 */
export const toggleEditorFolds = (editor: Editor, points: Point[]) => {
    points?.forEach((point) => {
        editor?.session?.['$toggleFoldWidget'](point.row, {});
    });
};
