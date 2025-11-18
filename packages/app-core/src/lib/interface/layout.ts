import powerbi from 'powerbi-visuals-api';

import {
    EDITOR_PANE_SPLIT_COLLAPSED_SIZE,
    EDITOR_PANE_SPLIT_DEFAULT_SIZE_PERCENT,
    PREVIEW_PANE_TOOLBAR_DEFAULT_SIZE_PERCENT,
    SPLIT_PANE_HANDLE_SIZE
} from './constants';
import { type EditorPanePosition } from './types';

/**
 * Calculate the default size of the resizable pane (in px) based on current viewport size and config defaults.
 */
export const getEditPaneDefaultWidth = (
    viewport: powerbi.IViewport,
    position: EditorPanePosition
) => {
    if (position === 'right') {
        return viewport.width * (1 - EDITOR_PANE_SPLIT_DEFAULT_SIZE_PERCENT);
    }
    return viewport.width * EDITOR_PANE_SPLIT_DEFAULT_SIZE_PERCENT;
};

/**
 * Work out the explicit width of the preview area, relative to the settings and editor pane.
 */
export const getEditorPreviewAreaWidth = (
    viewportWidth: number,
    paneWidth: number,
    position: EditorPanePosition
) =>
    (position === 'right' ? paneWidth : viewportWidth - paneWidth) -
    SPLIT_PANE_HANDLE_SIZE;

/**
 * Calculate an height for the preview area, so that we can use this to work out fit zoom functions.
 */
export const getPreviewAreaHeightInitial = (
    viewportHeight: number,
    currentHeight?: number
) => {
    return currentHeight || getToolbarInitialHeight(viewportHeight);
};

/**
 * Based on the current state of the resizable pane, resolve its actual width on the screen.
 */
export const getResizablePaneSize = (
    paneExpandedWidth: number,
    editorPaneIsExpanded: boolean,
    viewport: powerbi.IViewport,
    position: EditorPanePosition
) => {
    const collapsedSize =
            position === 'right'
                ? viewport.width - EDITOR_PANE_SPLIT_COLLAPSED_SIZE
                : EDITOR_PANE_SPLIT_COLLAPSED_SIZE,
        resolvedWidth =
            (editorPaneIsExpanded && paneExpandedWidth) ||
            (editorPaneIsExpanded &&
                getEditPaneDefaultWidth(viewport, position)) ||
            collapsedSize;
    return resolvedWidth;
};

export const getToolbarInitialHeight = (height: number) =>
    height - height * (PREVIEW_PANE_TOOLBAR_DEFAULT_SIZE_PERCENT / 100);
