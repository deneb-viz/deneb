import filter from 'lodash/filter';
import forEach from 'lodash/forEach';

import * as ace from 'ace-builds';
import Ace = ace.Ace;
import Editor = Ace.Editor;
import Range = ace.Range;

import { logDebug } from '../logging';

import {
    EDITOR_INDICATOR_ERROR_NAME,
    EDITOR_INDICATOR_TOOLTIP_NAME,
    EDITOR_INDICATOR_WARNING_NAME
} from '../../constants';
import { TSpecProvider } from '../../core/vega';
import { getJsonDocumentValidationResults } from '@deneb-viz/json-processing';
import { JsonContentType } from '@deneb-viz/core-dependencies';

/**
 * Clear down any existing validation markers before we (re) validate.
 */
const clearCustomMarkers = (editor: Editor) => {
    const { session } = editor;
    forEach(
        filter(
            session?.getMarkers(),
            (m) =>
                m.clazz === `${EDITOR_INDICATOR_ERROR_NAME}_marker` ||
                m.clazz === `${EDITOR_INDICATOR_WARNING_NAME}_marker` ||
                m.clazz === `${EDITOR_INDICATOR_TOOLTIP_NAME}`
        ),
        (marker) => {
            session.removeMarker(marker.id);
        }
    );
};

/**
 * For the supplied JSON content, perform validation against the schema and add
 * the necessary annotations to the editor. We also set the error state in the
 * store, so we can use this flag elsewhere.
 */
export const validateEditorJson = (
    editor: Editor,
    provider: TSpecProvider,
    editorRole: JsonContentType,
    content: string,
    currentlyHasErrors: boolean,
    storeErrorSetter: (hasErrors: boolean) => void
) => {
    if (!editor || !content) return;
    getJsonDocumentValidationResults(provider, editorRole, content).then(
        (results) => {
            clearCustomMarkers(editor);
            const { session } = editor;
            const annotations: Ace.Annotation[] = [];
            let editorHasErrors = false;
            for (const result of results) {
                logDebug(result);
                if (result.severity === 1) {
                    editorHasErrors = true;
                }
                annotations.push({
                    row: result.range.start.line,
                    text: result.message,
                    type:
                        result.severity === 1
                            ? EDITOR_INDICATOR_ERROR_NAME
                            : EDITOR_INDICATOR_WARNING_NAME
                });
                session?.addMarker(
                    new Range(
                        result.range.start.line,
                        result.range.start.character,
                        result.range.end.line,
                        result.range.end.character
                    ),
                    `${
                        result.severity === 1
                            ? EDITOR_INDICATOR_ERROR_NAME
                            : EDITOR_INDICATOR_WARNING_NAME
                    }_marker`,
                    'text'
                );
            }
            session?.clearAnnotations();
            session?.setAnnotations(annotations);
            if (editorHasErrors !== currentlyHasErrors) {
                storeErrorSetter(editorHasErrors);
            }
            logDebug('Validation results', { results, annotations });
        }
    );
};
