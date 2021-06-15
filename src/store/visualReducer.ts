import powerbi from 'powerbi-visuals-api';
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
    ICompiledSpec,
    IVisualUpdatePayload,
    TDataProcessingStage,
    IDataViewFlags,
    IEditorPaneUpdatePayload,
    TEditorOperation,
    IFixResult,
    IVisualDatasetUpdatePayload
} from '../types';
import Debugger from '../Debugger';
import { visualReducer as initialState } from '../config/visualReducer';
import { getEmptyDataset } from '../api/dataset';
import { isDeveloperModeEnabled } from '../api/developer';
import {
    calculateVegaViewport,
    getResizablePaneDefaultWidth,
    getResizablePaneSize,
    resolveInterfaceType,
    TVisualInterface
} from '../api/interface';

const visualSlice = createSlice({
    name: 'visual',
    initialState,
    reducers: {
        visualConstructor: (state, action: PayloadAction<IVisualHost>) => {
            const pl = action.payload;
            state.i18n = pl.createLocalizationManager();
            state.launchUrl = pl.launchUrl;
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
            const interfaceType = resolveInterfaceType(
                state.dataViewFlags,
                state.editMode,
                state.isInFocus,
                state.viewMode
            );
            Debugger.log(`Interface type: ${interfaceType}`);
            state.resizablePaneDefaultWidth = getResizablePaneDefaultWidth(
                pl.options.viewport,
                state.settings.editor.position
            );

            if (interfaceType === 'Edit') {
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
            state.interfaceType = interfaceType;
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
                state.interfaceType,
                state.settings.editor.position
            );
        },
        updateDataProcessingStage: (
            state,
            action: PayloadAction<TDataProcessingStage>
        ) => {
            state.dataProcessingStage = action.payload;
        },
        updateDataViewFlags: (state, action: PayloadAction<IDataViewFlags>) => {
            state.dataViewFlags = action.payload;
            state.interfaceType = resolveInterfaceType(
                state.dataViewFlags,
                state.editMode,
                state.isInFocus,
                state.viewMode
            );
        },
        updateInterfaceType: (
            state,
            action: PayloadAction<TVisualInterface>
        ) => {
            state.interfaceType = action.payload;
        },
        updateDataset: (
            state,
            action: PayloadAction<IVisualDatasetUpdatePayload>
        ) => {
            state.categories = action.payload.categories || [];
            state.dataset = action.payload.dataset;
            state.dataProcessingStage = 'Processed';
            state.interfaceType = resolveInterfaceType(
                state.dataViewFlags,
                state.editMode,
                state.isInFocus,
                state.viewMode
            );
            state.resizablePaneWidth = getResizablePaneSize(
                state.resizablePaneExpandedWidth,
                state.editorPaneIsExpanded,
                state.viewport,
                state.settings.editor.position
            );
        },
        resetLoadingCounters: (state) => {
            state.dataWindowsLoaded = 0;
            state.dataWindowsLoaded = 0;
        },
        recordDataWindowLoad: (state, action: PayloadAction<number>) => {
            state.dataWindowsLoaded++;
            state.dataRowsLoaded = action.payload;
        },
        recordInvalidDataView: (state) => {
            state.interfaceType = 'Landing';
            state.dataProcessingStage = 'Processed';
            state.dataset = getEmptyDataset();
            state.dataRowsLoaded = 0;
            state.dataWindowsLoaded = 0;
        },
        dataLoadingComplete: (state) => {
            state.dataProcessingStage = 'Processing';
        },
        updateSpec: (state, action: PayloadAction<ICompiledSpec>) => {
            state.spec = action.payload;
        },
        updateEditorPaneSize: (
            state,
            action: PayloadAction<IEditorPaneUpdatePayload>
        ) => {
            const { editorPaneWidth, editorPaneExpandedWidth } = action.payload;
            state.vegaViewport = calculateVegaViewport(
                state.viewport,
                editorPaneWidth,
                state.interfaceType,
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
                state.interfaceType,
                state.settings.editor.position
            );
        },
        toggleAutoApply: (state) => {
            state.autoApply = !state.autoApply;
        },
        updateSelectedOperation: (
            state,
            action: PayloadAction<TEditorOperation>
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
    updateInterfaceType,
    updateSpec,
    visualConstructor,
    visualUpdate,
    fourd3d3d,
    updateSelectedOperation,
    updateFixStatus
} = visualSlice.actions;

export default visualReducer;
