import { getState } from '../../store';
import { CSSProperties } from 'react';
import {
    ADVANCED_EDITOR_TOOLBAR_HEIGHT,
    EDITOR_PANE_SPLIT_MAX_SIZE_PERCENT,
    EDITOR_PANE_SPLIT_MIN_SIZE,
    PREVIEW_PANE_AREA_PADDING,
    PREVIEW_PANE_TOOLBAR_MIN_SIZE
} from '../../constants';
import { tokens } from '@fluentui/react-components';
import {
    EDITOR_PANE_SPLIT_COLLAPSED_SIZE,
    SPLIT_PANE_HANDLE_SIZE
} from '@deneb-viz/app-core';
import {
    DEBUG_PANE_CONFIGURATION,
    VISUAL_PREVIEW_ZOOM_CONFIGURATION
} from '@deneb-viz/configuration';

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
        height: SPLIT_PANE_HANDLE_SIZE,
        minHeight: SPLIT_PANE_HANDLE_SIZE,
        cursor: 'row-resize'
    }
};

export const resizerVerticalStyles: CSSProperties = {
    ...resizerStyles,
    ...{
        width: SPLIT_PANE_HANDLE_SIZE,
        minWidth: SPLIT_PANE_HANDLE_SIZE,
        cursor: 'col-resize'
    }
};

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

export const calculatePreviewMaximumHeight = (height: number) =>
    height -
    ADVANCED_EDITOR_TOOLBAR_HEIGHT -
    PREVIEW_PANE_TOOLBAR_MIN_SIZE -
    SPLIT_PANE_HANDLE_SIZE -
    DEBUG_PANE_CONFIGURATION.viewportBorderSize * 2;

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
        { default: zDefault, max } = VISUAL_PREVIEW_ZOOM_CONFIGURATION;
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
