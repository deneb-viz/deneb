import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;

import { getState } from '../../store';
import { getConfig } from '../utils/config';
import { TEditorPosition, TVisualMode } from '.';

const splitPaneDefaults = getConfig().splitPaneDefaults;
const visualViewportAdjust = getConfig().visualViewPortAdjust;
const resizerWidth = 3;
export const previewAreaPadding = 5;
export const previewToolbarHeight = 38;
export const previewToolbarPadding = 5;

/**
 * Calculate a width that ensures the editor pane caps and makes the pivot overflow as needed
 */
export const calculateEditorPaneMaxWidth = () => {
    const {
        visualSettings,
        editorPaneWidth,
        visualViewportCurrent,
        editorPreviewAreaWidth
    } = getState();
    return visualSettings.editor.position === 'left'
        ? editorPaneWidth
        : visualViewportCurrent.width - editorPreviewAreaWidth;
};

/**
 * Work out the explicit width of the preview area, relative to the settings and editor pane.
 */
export const getEditorPreviewAreaWidth = (
    viewportWidth: number,
    paneWidth: number,
    position: TEditorPosition
) =>
    (position === 'right' ? paneWidth : viewportWidth - paneWidth) -
    resizerWidth;

/**
 * Work out what the maximum size of the resizable pane should be (in px), based on the persisted visual (store) state.
 */
export const getResizablePaneMaxSize = () => {
    const { editorPaneIsExpanded, visualSettings, visualViewportCurrent } =
            getState(),
        { editor } = visualSettings,
        { maxSizePercent, minSize, collapsedSize } = splitPaneDefaults,
        resolvedSize =
            (editorPaneIsExpanded &&
                (editor.position === 'right'
                    ? visualViewportCurrent.width - minSize
                    : visualViewportCurrent.width * maxSizePercent)) ||
            collapsedSize;
    return resolvedSize;
};

/**
 * Work out what the minimum size of the resizable pane should be (in px), based on the persisted visual (store) state
 */
export const getResizablePaneMinSize = () => {
    const { editorPaneIsExpanded, visualSettings, visualViewportCurrent } =
            getState(),
        { editor } = visualSettings,
        { minSize, maxSizePercent, collapsedSize } = splitPaneDefaults;
    let resolvedCollapsedSize =
            editor.position === 'right'
                ? visualViewportCurrent.width - collapsedSize
                : collapsedSize,
        resolvedMinSize =
            editor.position === 'right'
                ? visualViewportCurrent.width * (1 - maxSizePercent)
                : minSize,
        resolvedSize =
            (editorPaneIsExpanded && resolvedMinSize) || resolvedCollapsedSize;
    return resolvedSize;
};

/**
 * Calculate the default size of the resizable pane (in px) based on current viewport size and config defaults.
 */
export const getResizablePaneDefaultWidth = (
    viewport: IViewport,
    position: TEditorPosition
) => {
    if (position === 'right') {
        return viewport.width * (1 - splitPaneDefaults.defaultSizePercent);
    }
    return viewport.width * splitPaneDefaults.defaultSizePercent;
};

/**
 * Based on the current state of the resizable pane, resolve its actual width on the screen.
 */
export const getResizablePaneSize = (
    paneExpandedWidth: number,
    editorPaneIsExpanded: boolean,
    viewport: IViewport,
    position: TEditorPosition
) => {
    const collapsedSize =
            position === 'right'
                ? viewport.width - splitPaneDefaults.collapsedSize
                : splitPaneDefaults.collapsedSize,
        resolvedWidth =
            (editorPaneIsExpanded && paneExpandedWidth) ||
            (editorPaneIsExpanded &&
                getResizablePaneDefaultWidth(viewport, position)) ||
            collapsedSize;
    return resolvedWidth;
};

/** Calculate the dimensions of the Vega/Vega-Lite visual viewport (height/width) based on the interface state and a
 *  number of other factors (including any config defaults). */
export const calculateVegaViewport = (
    viewport: IViewport,
    paneWidth: number,
    visualMode: TVisualMode,
    position: TEditorPosition
) => {
    let { height } = viewport,
        width =
            (visualMode === 'Editor' &&
                (position === 'right'
                    ? paneWidth
                    : viewport.width - paneWidth)) ||
            viewport.width;
    height -= visualViewportAdjust.top;
    width -= visualViewportAdjust.left;
    return { width, height };
};

/**
 * Calculate a width for the preview area height, so that we can use this to work out fit zoom functions.
 */
export const getPreviewAreaHeight = () => {
    const { visualViewportCurrent: visualViewport } = getState();
    return visualViewport.height - previewToolbarHeight;
};

/**
 * Derive suitable scale to apply to visual preview if wishing to fit to preview area.
 */
export const getZoomToFitScale = () => {
    const { editorPreviewAreaWidth, visualViewportReport } = getState(),
        { height, width } = visualViewportReport,
        previewWidth = getAdjustedPreviewAreaWidthForPadding(
            editorPreviewAreaWidth
        ),
        previewHeight = getAdjustedPreviewAreaHeightForPadding(
            getPreviewAreaHeight()
        ),
        scaleFactorWidth = Math.floor(100 / (width / previewWidth)),
        scaleFactorHeight = Math.floor(100 / (height / previewHeight)),
        { default: zDefault } = getConfig().zoomLevel;
    switch (true) {
        case willScaledDimensionFit(width, scaleFactorWidth, previewWidth) &&
            willScaledDimensionFit(height, scaleFactorWidth, previewHeight):
            return scaleFactorWidth;
        case willScaledDimensionFit(width, scaleFactorHeight, previewWidth) &&
            willScaledDimensionFit(height, scaleFactorHeight, previewHeight):
            return scaleFactorHeight;
        default:
            zDefault;
    }
};

const getAdjustedPreviewAreaWidthForPadding = (size: number) =>
    size - previewAreaPadding * 4;

const getAdjustedPreviewAreaHeightForPadding = (size: number) =>
    size - previewAreaPadding * 2 - previewToolbarPadding * 4;

const willScaledDimensionFit = (size: number, scale: number, limit: number) =>
    Math.floor(size * (scale / 100)) <= limit;
