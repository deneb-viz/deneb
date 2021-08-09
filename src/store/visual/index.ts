import { createSlice } from '@reduxjs/toolkit';
import { initialState } from './state';
import * as reducers from './reducers';

const slice = createSlice({
        name: 'visual',
        initialState,
        reducers
    }),
    visualReducer = slice.reducer;

export const {
    visualConstructor,
    visualUpdate,
    updateDataProcessingStage,
    updateDataViewFlags,
    updateDataset,
    resetLoadingCounters,
    recordDataWindowLoad,
    recordInvalidDataView,
    dataLoadingComplete,
    updateSpec,
    updateEditorPaneSize,
    toggleEditorPane,
    toggleAutoApply,
    updateSelectedOperation,
    updateFixStatus,
    dismissFixError,
    fourd3d3d,
    updateExportDialog,
    updateDirtyFlag,
    updateStagedSpecData,
    updateStagedConfigData
} = slice.actions;

export default visualReducer;
