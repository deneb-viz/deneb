import find from 'lodash/find';

import * as ace from 'ace-builds';
import Ace = ace.Ace;
import Editor = Ace.Editor;
import Range = ace.Range;

import { logDebug } from '../logging';
import { getEditorPointToPosition } from '../json-processing';
import { getProviderSchema } from '../specification/schema-validation';
import { TSpecProvider } from '../../core/vega';
import { TEditorRole } from './types';
import { EDITOR_INDICATOR_TOOLTIP_NAME } from '../../constants';
import { getJsonLanguageService, getJsonTextDocument } from '@deneb-viz/json';

/**
 * For a hover event in the editor, resolve it to get any relevant tooltip
 * information from the language services. We fudge this in Ace by returning a
 * marker, which we can then attach an event to in order to show the tooltip.
 */
export const getHoverResult = async (
    event: any,
    provider: TSpecProvider,
    editorRole: TEditorRole
) => {
    const editor: Editor = event.editor;
    let newMarker: Ace.MarkerLike;
    if (editor) {
        const ttMarker = getTooltipMarker(editor);
        editor?.session?.removeMarker(ttMarker?.id);
        logDebug('ttmarker', ttMarker);
        const pos = getPositionFromEvent(event);
        logDebug('pos', pos);
        if (!pos) return;
        const content = editor.getValue();
        const textDocument = getJsonTextDocument(content);
        const languageService = getJsonLanguageService(
            getProviderSchema({
                provider,
                isConfig: editorRole === 'Config'
            })
        );
        const jsonDocument = languageService.parseJSONDocument(textDocument);
        const hoverResult = await languageService.doHover(
            textDocument,
            getEditorPointToPosition(pos),
            jsonDocument
        );
        logDebug('Hover result', hoverResult);
        if (hoverResult) {
            editor.session.addMarker(
                new Range(
                    hoverResult.range.start.line,
                    hoverResult.range.start.character,
                    hoverResult.range.end.line,
                    hoverResult.range.end.character
                ),
                EDITOR_INDICATOR_TOOLTIP_NAME,
                'text'
            );
            newMarker = getTooltipMarker(editor);
            logDebug('newMarker', newMarker);
        }
        return { hoverResult, newMarker };
    }
};

/**
 * For a given event, attempt to resolve a valid text position based on the
 * mouse position and editor dimensions, for the language services to use.
 */
const getPositionFromEvent = (event: any) => {
    const editor: Editor = event.editor;
    if (editor) {
        const r = editor.renderer;
        const canvasPos = r.scroller.getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;
        const offset =
            (x + r.scrollLeft - canvasPos.left - r.$padding) / r.characterWidth;
        const row = Math.floor(
            (y + r.scrollTop - canvasPos.top) / r.lineHeight
        );
        const col = Math.round(offset);
        const screenPos = {
            row: row,
            column: col,
            side: offset - col > 0 ? 1 : -1
        };
        logDebug('screenPos', screenPos);
        const session = editor.session;
        const pos = session.screenToDocumentPosition(
            screenPos.row,
            screenPos.column
        );
        // avoid situations where the resolved cursor might exceed the length
        return screenPos.column > pos?.column ? null : pos;
    }
    return null;
};

/**
 * Find the tooltip marker in the current list of markers (if it's there).
 */
const getTooltipMarker = (editor: Editor) => {
    return find(
        editor?.session?.getMarkers(),
        (m) => m.clazz === EDITOR_INDICATOR_TOOLTIP_NAME
    );
};
