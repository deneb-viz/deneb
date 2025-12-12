import { getState } from '../../store';
import { CSSProperties } from 'react';
import {
    EDITOR_PANE_SPLIT_MAX_SIZE_PERCENT,
    EDITOR_PANE_SPLIT_MIN_SIZE
} from '../../constants';
import { tokens } from '@fluentui/react-components';
import {
    EDITOR_PANE_SPLIT_COLLAPSED_SIZE,
    SPLIT_PANE_HANDLE_SIZE
} from '@deneb-viz/app-core';

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

export const isPreviewDebugPaneExpanded = (
    areaHeight: number,
    maxHeight: number
) => {
    return areaHeight < maxHeight || false;
};
