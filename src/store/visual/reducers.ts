import { WritableDraft } from 'immer/dist/internal';
import { PayloadAction } from '@reduxjs/toolkit';
import {
    IVisualSliceState,
    IVisualUpdatePayload,
    IVisualDatasetUpdatePayload,
    IEditorPaneUpdatePayload
} from './state';

import powerbi from 'powerbi-visuals-api';
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import { getEmptyDataset } from '../../core/data/dataset';
import {
    IDataProcessingPayload,
    IDataViewFlags
} from '../../core/data/dataView';
import { TEditorRole } from '../../core/services/JsonEditorServices';
import { resolveVisualMode } from '../../core/ui';
import { ICompiledSpec, IFixResult } from '../../core/utils/specification';
import {
    calculateVegaViewport,
    getEditorPreviewAreaWidth,
    getResizablePaneDefaultWidth,
    getResizablePaneSize
} from '../../core/ui/advancedEditor';

const updateEditorPreviewAreaWidth = (
    state: WritableDraft<IVisualSliceState>
) =>
    getEditorPreviewAreaWidth(
        state.viewport.width,
        state.resizablePaneWidth,
        state.settings.editor.position
    );

export const visualConstructor = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<IVisualHost>
) => {
    const pl = action.payload;
    state.themeColors = pl.colorPalette['colors']?.map((c: any) => c.value);
    state.allowInteractions = pl.hostCapabilities.allowInteractions;
};

export const visualUpdate = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<IVisualUpdatePayload>
) => {
    const pl = action.payload,
        positionSwitch =
            state.settings.editor.position !== pl.settings.editor.position;
    state.updates++;
    state.editMode = pl.options.editMode;
    state.isInFocus = pl.options.isInFocus;
    state.settings = pl.settings;
    state.isNewDialogVisible = pl.settings.vega.isNewDialogOpen;
    state.viewMode = pl.options.viewMode;
    state.dataViewObjects = pl.options.dataViews[0]?.metadata.objects || {};

    // If editing report and focus mode, then we're in the editor
    const visualMode = resolveVisualMode(
        state.dataViewFlags,
        state.editMode,
        state.isInFocus,
        state.viewMode,
        state.spec
    );

    state.viewport = pl.options.viewport;
    if (visualMode !== 'Editor') {
        state.viewModeViewport = { ...pl.options.viewport };
    }

    state.resizablePaneDefaultWidth = getResizablePaneDefaultWidth(
        pl.options.viewport,
        state.settings.editor.position
    );

    if (visualMode === 'Editor') {
        if (state.resizablePaneWidth === null || positionSwitch) {
            state.resizablePaneWidth = state.resizablePaneDefaultWidth;
        }
        if (state.resizablePaneExpandedWidth === null || positionSwitch) {
            state.resizablePaneExpandedWidth = getResizablePaneDefaultWidth(
                pl.options.viewport,
                state.settings.editor.position
            );
        }
    }
    state.visualMode = visualMode;
    state.resizablePaneWidth = getResizablePaneSize(
        state.resizablePaneExpandedWidth,
        state.editorPaneIsExpanded,
        state.viewport,
        state.settings.editor.position
    );
    state.editorPreviewAreaWidth = updateEditorPreviewAreaWidth(state);

    // Resolve visual viewport
    state.vegaViewport = calculateVegaViewport(
        state.viewport,
        state.resizablePaneWidth,
        state.visualMode,
        state.settings.editor.position
    );
};

export const updateDataProcessingStage = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<IDataProcessingPayload>
) => {
    state.dataProcessingStage = action.payload.dataProcessingStage;
    state.canFetchMore = action.payload.canFetchMore;
};

export const updateDataViewFlags = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<IDataViewFlags>
) => {
    state.dataViewFlags = action.payload;
    state.visualMode = resolveVisualMode(
        state.dataViewFlags,
        state.editMode,
        state.isInFocus,
        state.viewMode,
        state.spec
    );
};

export const updateDataset = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<IVisualDatasetUpdatePayload>
) => {
    state.categories = action.payload.categories || [];
    state.dataset = action.payload.dataset;
    state.dataProcessingStage = 'Processed';
    state.visualMode = resolveVisualMode(
        state.dataViewFlags,
        state.editMode,
        state.isInFocus,
        state.viewMode,
        state.spec
    );
    state.resizablePaneWidth = getResizablePaneSize(
        state.resizablePaneExpandedWidth,
        state.editorPaneIsExpanded,
        state.viewport,
        state.settings.editor.position
    );
    state.editorPreviewAreaWidth = updateEditorPreviewAreaWidth(state);
};

export const resetLoadingCounters = (
    state: WritableDraft<IVisualSliceState>,
    action?: PayloadAction<boolean>
) => {
    state.dataWindowsLoaded = 0;
    state.dataWindowsLoaded = 0;
    state.canFetchMore = action.payload || false;
};

export const recordDataWindowLoad = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<number>
) => {
    state.dataWindowsLoaded++;
    state.dataRowsLoaded = action.payload;
};

export const recordInvalidDataView = (
    state: WritableDraft<IVisualSliceState>
) => {
    state.visualMode = resolveVisualMode(
        state.dataViewFlags,
        state.editMode,
        state.isInFocus,
        state.viewMode,
        state.spec
    );
    state.dataProcessingStage = 'Processed';
    state.dataset = getEmptyDataset();
    state.dataRowsLoaded = 0;
    state.dataWindowsLoaded = 0;
};

export const dataLoadingComplete = (
    state: WritableDraft<IVisualSliceState>
) => {
    state.dataProcessingStage = 'Processing';
    state.canFetchMore = false;
};

export const updateSpec = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<ICompiledSpec>
) => {
    state.spec = action.payload;
    state.visualMode = resolveVisualMode(
        state.dataViewFlags,
        state.editMode,
        state.isInFocus,
        state.viewMode,
        state.spec
    );
};

export const updateEditorPaneSize = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<IEditorPaneUpdatePayload>
) => {
    const { editorPaneWidth, editorPaneExpandedWidth } = action.payload;
    state.vegaViewport = calculateVegaViewport(
        state.viewport,
        editorPaneWidth,
        state.visualMode,
        state.settings.editor.position
    );
    state.resizablePaneWidth = editorPaneWidth;
    state.resizablePaneExpandedWidth = editorPaneExpandedWidth;
    state.editorPreviewAreaWidth = updateEditorPreviewAreaWidth(state);
};

export const toggleEditorPane = (state: WritableDraft<IVisualSliceState>) => {
    const newExpansionState = !state.editorPaneIsExpanded,
        newWidth = getResizablePaneSize(
            state.resizablePaneExpandedWidth,
            newExpansionState,
            state.viewport,
            state.settings.editor.position
        );
    state.editorPaneIsExpanded = newExpansionState;
    state.resizablePaneWidth = newWidth;
    state.editorPreviewAreaWidth = updateEditorPreviewAreaWidth(state);
    state.vegaViewport = calculateVegaViewport(
        state.viewport,
        newWidth,
        state.visualMode,
        state.settings.editor.position
    );
};

export const toggleAutoApply = (state: WritableDraft<IVisualSliceState>) => {
    state.autoApply = !state.autoApply;
};

export const updateSelectedOperation = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<TEditorRole>
) => {
    state.selectedOperation = action.payload;
};

export const updateFixStatus = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<IFixResult>
) => {
    const pl = action.payload;
    state.fixResult = pl;
};

export const dismissFixError = (state: WritableDraft<IVisualSliceState>) => {
    state.fixResult.dismissed = true;
};

export const fourd3d3d = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<boolean>
) => {
    state.fourd3d3d = action.payload;
};

export const updateExportDialog = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<boolean>
) => {
    state.isExportDialogVisible = action.payload;
};

export const updateDirtyFlag = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<boolean>
) => {
    state.isDirty = action.payload;
};

export const updateStagedSpecData = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<string>
) => {
    state.stagedSpec = action.payload;
};

export const updateStagedConfigData = (
    state: WritableDraft<IVisualSliceState>,
    action: PayloadAction<string>
) => {
    state.stagedConfig = action.payload;
};

export const hotkeysRegistered = (state: WritableDraft<IVisualSliceState>) => {
    state.hotkeysBound = true;
};
