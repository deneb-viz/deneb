import powerbi from 'powerbi-visuals-api';
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { dataViewService, renderingService } from '../services';
import {
    ICompiledSpec,
    IVisualDataset,
    IVisualUpdatePayload,
    TDataProcessingStage,
    IDataViewFlags,
    TVisualInterface,
    IEditorPaneUpdatePayload,
    TEditorOperation,
    IFixResult,
    IVisualSliceState
} from '../types';
import Debugger from '../Debugger';
import { visualReducer as initialState } from '../config/visualReducer';
import { visualFeatures } from '../config';

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

            if (visualFeatures.developerMode) {
                state.locale = pl.settings?.developer?.locale || state.locale;
            }
            // If editing report and focus mode, then we're in the editor
            const interfaceType = renderingService.resolveInterfaceType(
                <IVisualSliceState>state
            );
            Debugger.log(`Interface type: ${interfaceType}`);
            state.resizablePaneDefaultWidth = renderingService.getResizablePaneDefaultWidth(
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
                    state.resizablePaneExpandedWidth = renderingService.getResizablePaneDefaultWidth(
                        pl.options.viewport,
                        state.settings.editor.position
                    );
                }
            }
            state.interfaceType = interfaceType;
            state.resizablePaneWidth = renderingService.getResizablePaneSize(
                state.resizablePaneExpandedWidth,
                state.editorPaneIsExpanded,
                state.viewport,
                state.settings.editor.position
            );

            // Resolve visual viewport
            state.vegaViewport = renderingService.calculateVegaViewport(
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
            state.interfaceType = renderingService.resolveInterfaceType(
                <IVisualSliceState>state
            );
        },
        updateInterfaceType: (
            state,
            action: PayloadAction<TVisualInterface>
        ) => {
            state.interfaceType = action.payload;
        },
        updateDataset: (state, action: PayloadAction<IVisualDataset>) => {
            state.dataset = action.payload;
            state.dataProcessingStage = 'Processed';
            state.interfaceType = renderingService.resolveInterfaceType(
                <IVisualSliceState>state
            );
            state.resizablePaneWidth = renderingService.getResizablePaneSize(
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
            state.dataset = dataViewService.getEmptyDataset();
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
            state.vegaViewport = renderingService.calculateVegaViewport(
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
                newWidth = renderingService.getResizablePaneSize(
                    state.resizablePaneExpandedWidth,
                    newExpansionState,
                    state.viewport,
                    state.settings.editor.position
                );
            state.editorPaneIsExpanded = newExpansionState;
            state.resizablePaneWidth = newWidth;
            state.vegaViewport = renderingService.calculateVegaViewport(
                state.viewport,
                newWidth,
                state.interfaceType,
                state.settings.editor.position
            );
        },
        toggleAutoApply: (state) => {
            // TODO: some logic needed here to prevent in some situations
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
    updateInterfaceType,
    updateSpec,
    visualConstructor,
    visualUpdate,
    updateSelectedOperation,
    updateFixStatus
} = visualSlice.actions;

export default visualReducer;
