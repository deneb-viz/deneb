import powerbi from 'powerbi-visuals-api';
import DataViewObjects = powerbi.DataViewObjects;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import ISelectionId = powerbi.visuals.ISelectionId;

import { GetState, PartialState, SetState } from 'zustand';
import { TStoreState } from '.';
import { getEmptyDataset, IVisualDataset } from '../core/data/dataset';
import { TDataProcessingStage } from '../core/data/dataView';
import { resolveVisualMode } from '../core/ui';
import { getResizablePaneSize } from '../core/ui/advancedEditor';
import { getDataPointStatus } from '../core/interactivity/selection';

const defaultViewport = { width: 0, height: 0 };

export interface IDatasetSlice {
    dataset: IVisualDataset;
    datasetCanFetchMore: boolean;
    datasetCategories: DataViewCategoryColumn[];
    datasetHasSelectionAborted: boolean;
    datasetProcessingStage: TDataProcessingStage;
    datasetRowsLoaded: number;
    datasetWindowsLoaded: number;
    datasetViewHasValidMapping: boolean;
    datasetViewHasValidRoles: boolean;
    datasetViewIsValid: boolean;
    datasetViewObjects: DataViewObjects;
    confirmDatasetLoadComplete: () => void;
    resetDatasetLoadInformation: (canFetchMore: boolean) => void;
    updateDataset: (payload: IVisualDatasetUpdatePayload) => void;
    updateDatasetLoadInformation: (count: number) => void;
    updateDatasetProcessingStage: (payload: IDatasetProcessingPayload) => void;
    updateDatasetSelectors: (selectors: ISelectionId[]) => void;
    updateDatasetSelectionAbortStatus: (status: boolean) => void;
    updateDatasetViewFlags: (payload: IDataViewFlagsPayload) => void;
    updateDatasetViewInvalid: () => void;
}

export const createDatasetSlice = (
    set: SetState<TStoreState>,
    get: GetState<TStoreState>
) =>
    <IDatasetSlice>{
        dataset: getEmptyDataset(),
        datasetCanFetchMore: false,
        datasetCategories: [],
        datasetHasSelectionAborted: false,
        datasetProcessingStage: 'Initial',
        datasetRowsLoaded: 0,
        datasetWindowsLoaded: 0,
        datasetViewHasValidMapping: false,
        datasetViewHasValidRoles: false,
        datasetViewIsValid: false,
        datasetViewObjects: {},
        confirmDatasetLoadComplete: () =>
            set((state) => handleConfirmDatasetLoadComplete(state)),
        resetDatasetLoadInformation: (canFetchMore) =>
            set((state) =>
                handleResetDatasetLoadInformation(state, canFetchMore)
            ),
        updateDataset: (payload) =>
            set((state) => handleUpdateDataset(state, payload)),
        updateDatasetLoadInformation: (count) =>
            set((state) => handleUpdateDataLoadInformation(state, count)),
        updateDatasetProcessingStage: (stage) =>
            set((state) => handleUpdateDatasetProcessingStage(state, stage)),
        updateDatasetSelectors: (selectors) =>
            set((state) => handleUpdateDatasetSelectors(state, selectors)),
        updateDatasetSelectionAbortStatus: (status) =>
            set((state) =>
                handleUpdateDatasetSelectionAbortStatus(state, status)
            ),
        updateDatasetViewFlags: (payload) =>
            set((state) => handleUpdateDatasetViewFlags(state, payload)),
        updateDatasetViewInvalid: () =>
            set((state) => handleUpdateDatasetViewInvalid(state))
    };

interface IDatasetProcessingPayload {
    dataProcessingStage: TDataProcessingStage;
    canFetchMore: boolean;
}

interface IVisualDatasetUpdatePayload {
    categories: DataViewCategoryColumn[];
    dataset: IVisualDataset;
}

interface IDataViewFlagsPayload {
    datasetViewHasValidMapping: boolean;
    datasetViewHasValidRoles: boolean;
    datasetViewIsValid: boolean;
}

const handleConfirmDatasetLoadComplete = (
    state: TStoreState
): PartialState<TStoreState, never, never, never, never> => ({
    datasetCanFetchMore: false,
    datasetProcessingStage: 'Processed'
});

const handleUpdateDataset = (
    state: TStoreState,
    payload: IVisualDatasetUpdatePayload
): PartialState<TStoreState, never, never, never, never> => {
    const datasetCategories = payload.categories || [];
    return {
        dataset: payload.dataset,
        datasetCategories,
        datasetProcessingStage: 'Processed',
        editorPaneWidth: getResizablePaneSize(
            state.editorPaneExpandedWidth,
            state.editorPaneIsExpanded,
            state.visualViewportCurrent,
            state.visualSettings.editor.position
        ),
        visualMode: resolveVisualMode(
            state.datasetViewHasValidMapping,
            state.visualEditMode,
            state.visualIsInFocusMode,
            state.visualViewMode,
            state.editorSpec
        )
    };
};

const handleResetDatasetLoadInformation = (
    state: TStoreState,
    canFetchMore: boolean
): PartialState<TStoreState, never, never, never, never> => ({
    datasetCanFetchMore: canFetchMore,
    datasetRowsLoaded: 0,
    datasetWindowsLoaded: 0
});

const handleUpdateDataLoadInformation = (
    state: TStoreState,
    count: number
): PartialState<TStoreState, never, never, never, never> => ({
    datasetRowsLoaded: state.datasetRowsLoaded + count,
    datasetWindowsLoaded: state.datasetWindowsLoaded + 1
});

const handleUpdateDatasetProcessingStage = (
    state: TStoreState,
    payload: IDatasetProcessingPayload
): PartialState<TStoreState, never, never, never, never> => ({
    datasetCanFetchMore: payload.canFetchMore,
    datasetProcessingStage: payload.dataProcessingStage
});

const handleUpdateDatasetSelectors = (
    state: TStoreState,
    selectors: ISelectionId[]
): PartialState<TStoreState, never, never, never, never> => ({
    datasetHasSelectionAborted: false,
    dataset: {
        ...state.dataset,
        ...{
            values: state.dataset.values.slice().map((v) => ({
                ...v,
                __selected__: getDataPointStatus(v.__identity__, selectors)
            }))
        }
    }
});

const handleUpdateDatasetSelectionAbortStatus = (
    state: TStoreState,
    status: boolean
): PartialState<TStoreState, never, never, never, never> => ({
    datasetHasSelectionAborted: status
});

const handleUpdateDatasetViewFlags = (
    state: TStoreState,
    payload: IDataViewFlagsPayload
): PartialState<TStoreState, never, never, never, never> => {
    const {
        datasetViewHasValidMapping,
        datasetViewHasValidRoles,
        datasetViewIsValid
    } = payload;
    return {
        datasetViewHasValidMapping,
        datasetViewHasValidRoles,
        datasetViewIsValid,
        visualMode: resolveVisualMode(
            datasetViewHasValidMapping,
            state.visualEditMode,
            state.visualIsInFocusMode,
            state.visualViewMode,
            state.editorSpec
        )
    };
};

const handleUpdateDatasetViewInvalid = (
    state: TStoreState
): PartialState<TStoreState, never, never, never, never> => ({
    dataset: getEmptyDataset(),
    datasetProcessingStage: 'Processed',
    datasetRowsLoaded: 0,
    datasetWindowsLoaded: 0,
    visualMode: resolveVisualMode(
        state.datasetViewHasValidMapping,
        state.visualEditMode,
        state.visualIsInFocusMode,
        state.visualViewMode,
        state.editorSpec
    )
});
