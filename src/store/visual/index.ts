import { createSlice } from '@reduxjs/toolkit';
import { initialState } from './state';
import * as reducers from './reducers';

const slice = createSlice({
    name: 'visual',
    initialState,
    reducers
});

export const visual = slice.reducer,
    {
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
        hotkeysRegistered,
        updateExportDialog,
        updateDirtyFlag,
        updateStagedSpecData,
        updateStagedConfigData,
        updateSelectors,
        setSelectionAborted
    } = slice.actions;
