import powerbi from 'powerbi-visuals-api';

import {
    EDITOR_PANE_SPLIT_COLLAPSED_SIZE,
    EDITOR_PANE_SPLIT_DEFAULT_SIZE_PERCENT,
    EDITOR_TOOLBAR_HEIGHT,
    PREVIEW_PANE_AREA_PADDING,
    PREVIEW_PANE_TOOLBAR_DEFAULT_SIZE_PERCENT,
    PREVIEW_PANE_TOOLBAR_MIN_SIZE,
    SPLIT_PANE_HANDLE_SIZE,
    ZOOM_FIT_BUFFER
} from './constants';
import { type EditorPanePosition } from './types';
import {
    DEBUG_PANE_CONFIGURATION,
    VISUAL_PREVIEW_ZOOM_CONFIGURATION
} from '@deneb-viz/configuration';
import { getDenebState } from '../../state';

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

export const getPreviewAreaHeightMaximum = (height: number) =>
    height -
    EDITOR_TOOLBAR_HEIGHT -
    PREVIEW_PANE_TOOLBAR_MIN_SIZE -
    SPLIT_PANE_HANDLE_SIZE -
    DEBUG_PANE_CONFIGURATION.viewportBorderSize * 2;

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

/**
 * Derive suitable scale to apply to visual preview if wishing to fit to preview area.
 */
export const getZoomToFitScale = () => {
    const {
            editorPreviewAreaWidth,
            editorPreviewAreaHeight,
            visualViewportReport
        } = getDenebState(),
        { height, width } = visualViewportReport,
        previewWidth = getAdjustedPreviewAreaWidthForPadding(
            editorPreviewAreaWidth ?? 0
        ),
        previewHeight = getAdjustedPreviewAreaHeightForPadding(
            editorPreviewAreaHeight ?? 0
        ),
        scaleFactorWidth = Math.floor(
            100 / (width / (previewWidth - ZOOM_FIT_BUFFER))
        ),
        scaleFactorHeight = Math.floor(
            100 / (height / (previewHeight - ZOOM_FIT_BUFFER))
        ),
        { default: zDefault, max } = VISUAL_PREVIEW_ZOOM_CONFIGURATION;
    switch (true) {
        case willScaledDimensionFit(width, scaleFactorWidth, previewWidth) &&
            willScaledDimensionFit(height, scaleFactorWidth, previewHeight):
            return Math.min(scaleFactorWidth, max);
        case willScaledDimensionFit(width, scaleFactorHeight, previewWidth) &&
            willScaledDimensionFit(height, scaleFactorHeight, previewHeight):
            return Math.min(scaleFactorHeight, max);
        default:
            return zDefault;
    }
};

const getAdjustedPreviewAreaWidthForPadding = (size: number) =>
    size - PREVIEW_PANE_AREA_PADDING * 4;

const getAdjustedPreviewAreaHeightForPadding = (size: number) =>
    size - PREVIEW_PANE_AREA_PADDING * 2 - PREVIEW_PANE_AREA_PADDING * 4;

const willScaledDimensionFit = (size: number, scale: number, limit: number) =>
    Math.floor(size * (scale / 100)) <= limit;
