import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;

import { getState } from '../../store';
import { TEditorPosition } from '.';
import { CSSProperties } from 'react';
import {
    ADVANCED_EDITOR_TOOLBAR_HEIGHT,
    EDITOR_PANE_SPLIT_COLLAPSED_SIZE,
    EDITOR_PANE_SPLIT_DEFAULT_SIZE_PERCENT,
    EDITOR_PANE_SPLIT_MAX_SIZE_PERCENT,
    EDITOR_PANE_SPLIT_MIN_SIZE,
    PREVIEW_PANE_AREA_PADDING,
    PREVIEW_PANE_TOOLBAR_DEFAULT_SIZE_PERCENT,
    PREVIEW_PANE_TOOLBAR_MIN_SIZE,
    SPLIT_PANE_RESIZER_SIZE
} from '../../constants';
import { tokens } from '@fluentui/react-components';
import { PREVIEW_PANE_DEFAULTS, VISUAL_PREVIEW_ZOOM } from '../../../config';

/**
 * How many pixels to apply to the preview area calculations as a "safety"
 * margin. On occasion, the calculation results in a slightly higher than
 * desirable scaling result and this helps to err on the lower-side of things
 * so that the preview will definitely fit.
 */
const ZOOM_FIT_BUFFER = 15;

const resizerBoxSizing = 'border-box';
const resizerBackgroundClip = 'padding-box';

const resizerStyles: CSSProperties = {
    background: tokens.colorNeutralBackground5,
    zIndex: 1,
    MozBoxSizing: resizerBoxSizing,
    WebkitBoxSizing: resizerBoxSizing,
    boxSizing: resizerBoxSizing,
    MozBackgroundClip: resizerBackgroundClip,
    WebkitBackgroundClip: resizerBackgroundClip,
    backgroundClip: resizerBackgroundClip,
    border: `1px solid ${tokens.colorNeutralStroke2}`
};

const resizerPaneStyles: CSSProperties = {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxSizing: 'border-box'
};

export const resizerPaneVerticalStyles: CSSProperties = {
    ...resizerPaneStyles,
    ...{
        overflow: 'none'
    }
};

export const resizerHorizontalStyles: CSSProperties = {
    ...resizerStyles,
    ...{
        height: SPLIT_PANE_RESIZER_SIZE,
        minHeight: SPLIT_PANE_RESIZER_SIZE,
        cursor: 'row-resize'
    }
};

export const resizerVerticalStyles: CSSProperties = {
    ...resizerStyles,
    ...{
        width: SPLIT_PANE_RESIZER_SIZE,
        minWidth: SPLIT_PANE_RESIZER_SIZE,
        cursor: 'col-resize'
    }
};

export type TPreviewPivotRole = 'log' | 'data' | 'signal';

/**
 * Calculate a width that ensures the editor pane caps and makes the pivot overflow as needed
 */
export const calculateEditorPaneMaxWidth = () => {
    const {
        editorPaneWidth,
        editorPreviewAreaWidth,
        visualSettings: {
            editor: {
                json: {
                    position: { value: position }
                }
            }
        },
        visualViewportCurrent: { width }
    } = getState();
    return position === 'left'
        ? editorPaneWidth
        : width - editorPreviewAreaWidth;
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
    SPLIT_PANE_RESIZER_SIZE;

/**
 * Work out what the maximum size of the resizable pane should be (in px), based on the persisted visual (store) state.
 */
export const getResizablePaneMaxSize = () => {
    const { editorPaneIsExpanded, visualSettings, visualViewportCurrent } =
        getState();
    const { editor } = visualSettings;
    return (
        (editorPaneIsExpanded &&
            (editor.json.position.value === 'right'
                ? visualViewportCurrent.width - EDITOR_PANE_SPLIT_MIN_SIZE
                : visualViewportCurrent.width *
                  EDITOR_PANE_SPLIT_MAX_SIZE_PERCENT)) ||
        EDITOR_PANE_SPLIT_COLLAPSED_SIZE
    );
};

/**
 * Work out what the minimum size of the resizable pane should be (in px), based on the persisted visual (store) state
 */
export const getResizablePaneMinSize = () => {
    const { editorPaneIsExpanded, visualSettings, visualViewportCurrent } =
        getState();
    const { editor } = visualSettings;
    const resolvedCollapsedSize =
        editor.json.position.value === 'right'
            ? visualViewportCurrent.width - EDITOR_PANE_SPLIT_COLLAPSED_SIZE
            : EDITOR_PANE_SPLIT_COLLAPSED_SIZE;
    const resolvedMinSize =
        editor.json.position.value === 'right'
            ? visualViewportCurrent.width *
              (1 - EDITOR_PANE_SPLIT_MAX_SIZE_PERCENT)
            : EDITOR_PANE_SPLIT_MIN_SIZE;
    const resolvedSize =
        (editorPaneIsExpanded && resolvedMinSize) || resolvedCollapsedSize;
    return resolvedSize;
};

/**
 * Calculate the default size of the resizable pane (in px) based on current viewport size and config defaults.
 */
export const getEditPaneDefaultWidth = (
    viewport: IViewport,
    position: TEditorPosition
) => {
    if (position === 'right') {
        return viewport.width * (1 - EDITOR_PANE_SPLIT_DEFAULT_SIZE_PERCENT);
    }
    return viewport.width * EDITOR_PANE_SPLIT_DEFAULT_SIZE_PERCENT;
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
                ? viewport.width - EDITOR_PANE_SPLIT_COLLAPSED_SIZE
                : EDITOR_PANE_SPLIT_COLLAPSED_SIZE,
        resolvedWidth =
            (editorPaneIsExpanded && paneExpandedWidth) ||
            (editorPaneIsExpanded &&
                getEditPaneDefaultWidth(viewport, position)) ||
            collapsedSize;
    return resolvedWidth;
};

/**
 * Calculate an height for the preview area, so that we can use this to work out fit zoom functions.
 */
export const getPreviewAreaHeightInitial = (
    viewportHeight: number,
    currentHeight?: number
) => {
    return currentHeight || calculateToolbarInitialHeight(viewportHeight);
};

export const calculatePreviewMaximumHeight = (height: number) =>
    height -
    ADVANCED_EDITOR_TOOLBAR_HEIGHT -
    PREVIEW_PANE_TOOLBAR_MIN_SIZE -
    SPLIT_PANE_RESIZER_SIZE -
    PREVIEW_PANE_DEFAULTS.viewportBorderSize * 2;

export const calculateToolbarInitialHeight = (height: number) =>
    height - height * (PREVIEW_PANE_TOOLBAR_DEFAULT_SIZE_PERCENT / 100);

/**
 * Derive suitable scale to apply to visual preview if wishing to fit to preview area.
 */
export const getZoomToFitScale = () => {
    const {
            editorPreviewAreaWidth,
            editorPreviewAreaHeight,
            visualViewportReport
        } = getState(),
        { height, width } = visualViewportReport,
        previewWidth = getAdjustedPreviewAreaWidthForPadding(
            editorPreviewAreaWidth
        ),
        previewHeight = getAdjustedPreviewAreaHeightForPadding(
            editorPreviewAreaHeight
        ),
        scaleFactorWidth = Math.floor(
            100 / (width / (previewWidth - ZOOM_FIT_BUFFER))
        ),
        scaleFactorHeight = Math.floor(
            100 / (height / (previewHeight - ZOOM_FIT_BUFFER))
        ),
        { default: zDefault, max } = VISUAL_PREVIEW_ZOOM;
    switch (true) {
        case willScaledDimensionFit(width, scaleFactorWidth, previewWidth) &&
            willScaledDimensionFit(height, scaleFactorWidth, previewHeight):
            return Math.min(scaleFactorWidth, max);
        case willScaledDimensionFit(width, scaleFactorHeight, previewWidth) &&
            willScaledDimensionFit(height, scaleFactorHeight, previewHeight):
            return Math.min(scaleFactorHeight, max);
        default:
            zDefault;
    }
};

export const isPreviewDebugPaneExpanded = (
    areaHeight: number,
    maxHeight: number
) => {
    return areaHeight < maxHeight || false;
};

const getAdjustedPreviewAreaWidthForPadding = (size: number) =>
    size - PREVIEW_PANE_AREA_PADDING * 4;

const getAdjustedPreviewAreaHeightForPadding = (size: number) =>
    size - PREVIEW_PANE_AREA_PADDING * 2 - PREVIEW_PANE_AREA_PADDING * 4;

const willScaledDimensionFit = (size: number, scale: number, limit: number) =>
    Math.floor(size * (scale / 100)) <= limit;
