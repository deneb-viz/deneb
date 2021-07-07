export {
    calculateVegaViewport,
    getResizablePaneDefaultWidth,
    getResizablePaneMaxSize,
    getResizablePaneMinSize,
    getResizablePaneSize,
    isApplyDialogHidden,
    isDialogOpen,
    resolveInterfaceType,
    TEditorPosition,
    TVisualInterface
};

import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import ViewMode = powerbi.ViewMode;
import EditMode = powerbi.EditMode;

import { getConfig } from '../config';
import { getState } from '../store';
import { IDataViewFlags } from '../../types';

const calculateVegaViewport = (
    viewport: IViewport,
    paneWidth: number,
    interfaceType: TVisualInterface,
    position: TEditorPosition
) => {
    let { height } = viewport,
        width =
            (interfaceType === 'Edit' &&
                (position === 'right'
                    ? paneWidth
                    : viewport.width - paneWidth)) ||
            viewport.width;
    height -= visualViewportAdjust.top;
    width -= visualViewportAdjust.left;
    return { width, height };
};

const getResizablePaneDefaultWidth = (
    viewport: IViewport,
    position: TEditorPosition
) => {
    if (position === 'right') {
        return viewport.width * (1 - splitPaneDefaults.defaultSizePercent);
    }
    return viewport.width * splitPaneDefaults.defaultSizePercent;
};

const getResizablePaneMaxSize = () => {
    const { editorPaneIsExpanded, settings, viewport } = getState().visual,
        { editor } = settings,
        { maxSizePercent, minSize, collapsedSize } = splitPaneDefaults,
        resolvedSize =
            (editorPaneIsExpanded &&
                (editor.position === 'right'
                    ? viewport.width - minSize
                    : viewport.width * maxSizePercent)) ||
            collapsedSize;
    return resolvedSize;
};

const getResizablePaneMinSize = () => {
    const { editorPaneIsExpanded, settings, viewport } = getState().visual,
        { editor } = settings,
        { minSize, maxSizePercent, collapsedSize } = splitPaneDefaults;
    let resolvedCollapsedSize =
            editor.position === 'right'
                ? viewport.width - collapsedSize
                : collapsedSize,
        resolvedMinSize =
            editor.position === 'right'
                ? viewport.width * (1 - maxSizePercent)
                : minSize,
        resolvedSize =
            (editorPaneIsExpanded && resolvedMinSize) || resolvedCollapsedSize;
    return resolvedSize;
};

const getResizablePaneSize = (
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

const isApplyDialogHidden = () => {
    const { interfaceType, isDirty } = getState().visual;
    return !(isDirty && interfaceType === 'View');
};

const isDialogOpen = () => {
    const { isNewDialogVisible, isExportDialogVisible } = getState().visual;
    return isNewDialogVisible || isExportDialogVisible;
};

const resolveInterfaceType = (
    dataViewFlags: IDataViewFlags,
    editMode: EditMode,
    isInFocus: boolean,
    viewMode: ViewMode
) => {
    switch (true) {
        case dataViewFlags.hasValidDataViewMapping &&
            viewMode === ViewMode.Edit &&
            editMode === EditMode.Advanced &&
            isInFocus: {
            return 'Edit';
        }
        case !dataViewFlags.hasValidDataViewMapping: {
            return 'Landing';
        }
        default: {
            return 'View';
        }
    }
};

const splitPaneDefaults = getConfig().splitPaneDefaults;
const visualViewportAdjust = getConfig().visualViewPortAdjust;

type TEditorPosition = 'left' | 'right';
type TVisualInterface = 'Landing' | 'View' | 'Edit';
