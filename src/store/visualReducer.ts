import powerbi from 'powerbi-visuals-api';
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import Debugger from '../Debugger';
import { visualReducer as initialState } from '../config/visualReducer';
import { getEmptyDataset, IVisualDataset } from '../api/dataset';
import { IDataProcessingPayload, IDataViewFlags } from '../api/dataView';
import { isDeveloperModeEnabled } from '../api/developer';
import { TEditorRole } from '../api/editor';
import {
    calculateVegaViewport,
    getResizablePaneDefaultWidth,
    getResizablePaneSize,
    resolveVisualMode
} from '../api/ui';
import { ICompiledSpec, IFixResult } from '../api/specification';
import VisualSettings from '../properties/VisualSettings';

interface IVisualDatasetUpdatePayload {
    categories: DataViewCategoryColumn[];
    dataset: IVisualDataset;
}

interface IVisualUpdatePayload {
    settings: VisualSettings;
    options: VisualUpdateOptions;
}

interface IEditorPaneUpdatePayload {
    editorPaneWidth: number;
    editorPaneExpandedWidth: number;
}

const visualSlice = createSlice({
    name: 'visual',
    initialState,
    reducers: {
        visualConstructor: (state, action: PayloadAction<IVisualHost>) => {
            const pl = action.payload;
            state.i18n = pl.createLocalizationManager();
            state.fetchMoreData = pl.fetchMoreData;
            state.launchUrl = pl.launchUrl;
            state.persistProperties = pl.persistProperties;
            state.locale = pl.locale;
            state.themeColors = pl.colorPalette['colors']?.map(
                (c: any) => c.value
            );
            let selectionManager = pl.createSelectionManager();
            selectionManager.registerOnSelectCallback(
                (ids: powerbi.extensibility.ISelectionId[]) => {
                    Debugger.log('Select callback executed from visual host.');
                }
            );
            state.selectionIdBuilder = pl.createSelectionIdBuilder;
            state.selectionManager = selectionManager;
            state.tooltipService = pl.tooltipService;
            state.allowInteractions = pl.allowInteractions;
        },
        visualUpdate: (state, action: PayloadAction<IVisualUpdatePayload>) => {
            const pl = action.payload,
                positionSwitch =
                    state.settings.editor.position !==
                    pl.settings.editor.position;
            state.updates++;
            state.editMode = pl.options.editMode;
            state.isInFocus = pl.options.isInFocus;
            state.settings = pl.settings;
            state.isNewDialogVisible = pl.settings.vega.isNewDialogOpen;
            state.viewport = pl.options.viewport;
            state.viewMode = pl.options.viewMode;
            state.dataViewObjects =
                pl.options.dataViews[0]?.metadata.objects || {};

            if (isDeveloperModeEnabled) {
                state.locale = pl.settings?.developer?.locale || state.locale;
            }
            // If editing report and focus mode, then we're in the editor
            const visualMode = resolveVisualMode(
                state.dataViewFlags,
                state.editMode,
                state.isInFocus,
                state.viewMode,
                state.spec
            );
            state.resizablePaneDefaultWidth = getResizablePaneDefaultWidth(
                pl.options.viewport,
                state.settings.editor.position
            );

            if (visualMode === 'Editor') {
                if (state.resizablePaneWidth === null || positionSwitch) {
                    state.resizablePaneWidth = state.resizablePaneDefaultWidth;
                }
                if (
                    state.resizablePaneExpandedWidth === null ||
                    positionSwitch
                ) {
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

            // Resolve visual viewport
            state.vegaViewport = calculateVegaViewport(
                state.viewport,
                state.resizablePaneWidth,
                state.visualMode,
                state.settings.editor.position
            );
        },
        updateDataProcessingStage: (
            state,
            action: PayloadAction<IDataProcessingPayload>
        ) => {
            state.dataProcessingStage = action.payload.dataProcessingStage;
            state.canFetchMore = action.payload.canFetchMore;
        },
        updateDataViewFlags: (state, action: PayloadAction<IDataViewFlags>) => {
            state.dataViewFlags = action.payload;
            state.visualMode = resolveVisualMode(
                state.dataViewFlags,
                state.editMode,
                state.isInFocus,
                state.viewMode,
                state.spec
            );
        },
        updateDataset: (
            state,
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
        },
        resetLoadingCounters: (state, action?: PayloadAction<boolean>) => {
            state.dataWindowsLoaded = 0;
            state.dataWindowsLoaded = 0;
            state.canFetchMore = action.payload || false;
        },
        recordDataWindowLoad: (state, action: PayloadAction<number>) => {
            state.dataWindowsLoaded++;
            state.dataRowsLoaded = action.payload;
        },
        recordInvalidDataView: (state) => {
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
        },
        dataLoadingComplete: (state) => {
            state.dataProcessingStage = 'Processing';
            state.canFetchMore = false;
        },
        updateSpec: (state, action: PayloadAction<ICompiledSpec>) => {
            state.spec = action.payload;
            state.visualMode = resolveVisualMode(
                state.dataViewFlags,
                state.editMode,
                state.isInFocus,
                state.viewMode,
                state.spec
            );
        },
        updateEditorPaneSize: (
            state,
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
        },
        toggleEditorPane: (state) => {
            const newExpansionState = !state.editorPaneIsExpanded,
                newWidth = getResizablePaneSize(
                    state.resizablePaneExpandedWidth,
                    newExpansionState,
                    state.viewport,
                    state.settings.editor.position
                );
            state.editorPaneIsExpanded = newExpansionState;
            state.resizablePaneWidth = newWidth;
            state.vegaViewport = calculateVegaViewport(
                state.viewport,
                newWidth,
                state.visualMode,
                state.settings.editor.position
            );
        },
        toggleAutoApply: (state) => {
            state.autoApply = !state.autoApply;
        },
        updateSelectedOperation: (
            state,
            action: PayloadAction<TEditorRole>
        ) => {
            state.selectedOperation = action.payload;
        },
        updateFixStatus: (state, action: PayloadAction<IFixResult>) => {
            const pl = action.payload;
            state.fixResult = pl;
        },
        dismissFixError: (state) => {
            state.fixResult.dismissed = true;
        },
        fourd3d3d: (state, action: PayloadAction<boolean>) => {
            state.fourd3d3d = action.payload;
        },
        updateExportDialog: (state, action: PayloadAction<boolean>) => {
            state.isExportDialogVisible = action.payload;
        },
        updateDirtyFlag: (state, action: PayloadAction<boolean>) => {
            state.isDirty = action.payload;
        },
        updateStagedSpecData: (state, action: PayloadAction<string>) => {
            state.stagedSpec = action.payload;
        },
        updateStagedConfigData: (state, action: PayloadAction<string>) => {
            state.stagedConfig = action.payload;
        }
    }
});

const visualReducer = visualSlice.reducer;

export const {
    dataLoadingComplete,
    dismissFixError,
    recordDataWindowLoad,
    recordInvalidDataView,
    resetLoadingCounters,
    toggleAutoApply,
    toggleEditorPane,
    updateDataProcessingStage,
    updateDataset,
    updateDataViewFlags,
    updateEditorPaneSize,
    updateExportDialog,
    updateSpec,
    visualConstructor,
    visualUpdate,
    fourd3d3d,
    updateDirtyFlag,
    updateSelectedOperation,
    updateFixStatus,
    updateStagedSpecData,
    updateStagedConfigData
} = visualSlice.actions;

export default visualReducer;
