import powerbi from 'powerbi-visuals-api';
import DataViewObjects = powerbi.DataViewObjects;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import ISelectionId = powerbi.visuals.ISelectionId;

import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import { TStoreState } from '.';
import {
    doUnallocatedFieldsExist,
    getDatasetHash,
    getEmptyDataset
} from '../core/data/dataset';
import { IVisualDataset, TDataProcessingStage } from '../core/data';
import { resolveVisualMode } from '../core/ui';
import { getResizablePaneSize } from '../core/ui/advancedEditor';
import { getFieldsInUseFromSpec } from '../features/template';
import { DATASET_IDENTITY_NAME } from '../constants';
import {
    getDataPointCrossFilterStatus,
    isCrossFilterPropSet
} from '../features/interactivity';
import { getDatasetTemplateFields } from '../core/data/fields';
import {
    getParsedSpec,
    getSpecificationParseOptions
} from '../features/specification/logic';
import { logDebug } from '../features/logging';

export interface IDatasetSlice {
    dataset: IVisualDataset;
    datasetCanFetchMore: boolean;
    datasetCategories: DataViewCategoryColumn[];
    datasetHasHighlights: boolean;
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

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <IDatasetSlice>{
        dataset: getEmptyDataset(),
        datasetCanFetchMore: false,
        datasetCategories: [],
        datasetHasHighlights: false,
        datasetHasSelectionAborted: false,
        datasetProcessingStage: 'Initial',
        datasetRowsLoaded: 0,
        datasetWindowsLoaded: 0,
        datasetViewHasValidMapping: false,
        datasetViewHasValidRoles: false,
        datasetViewIsValid: false,
        datasetViewObjects: {},
        confirmDatasetLoadComplete: () =>
            set(
                () => handleConfirmDatasetLoadComplete(),
                false,
                'confirmDatasetLoadComplete'
            ),
        resetDatasetLoadInformation: (canFetchMore) =>
            set(
                (state) =>
                    handleResetDatasetLoadInformation(state, canFetchMore),
                false,
                'resetDatasetLoadInformation'
            ),
        updateDataset: (payload) =>
            set(
                (state) => handleUpdateDataset(state, payload),
                false,
                'updateDataset'
            ),
        updateDatasetLoadInformation: (count) =>
            set(
                (state) => handleUpdateDataLoadInformation(state, count),
                false,
                'updateDatasetLoadInformation'
            ),
        updateDatasetProcessingStage: (stage) =>
            set(
                (state) => handleUpdateDatasetProcessingStage(state, stage),
                false,
                'updateDatasetProcessingStage'
            ),
        updateDatasetSelectors: (selectors) =>
            set(
                (state) => handleUpdateDatasetSelectors(state, selectors),
                false,
                'updateDatasetSelectors'
            ),
        updateDatasetSelectionAbortStatus: (status) =>
            set(
                (state) =>
                    handleUpdateDatasetSelectionAbortStatus(state, status),
                false,
                'updateDatasetSelectionAbortStatus'
            ),
        updateDatasetViewFlags: (payload) =>
            set(
                (state) => handleUpdateDatasetViewFlags(state, payload),
                false,
                'updateDatasetViewFlags'
            ),
        updateDatasetViewInvalid: () =>
            set(
                (state) => handleUpdateDatasetViewInvalid(state),
                false,
                'updateDatasetViewInvalid'
            )
    };

export const createDatasetSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    IDatasetSlice
> = sliceStateInitializer;

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

const handleConfirmDatasetLoadComplete = (): Partial<TStoreState> => ({
    datasetCanFetchMore: false,
    datasetProcessingStage: 'Processed'
});

const handleUpdateDataset = (
    state: TStoreState,
    payload: IVisualDatasetUpdatePayload
): Partial<TStoreState> => {
    logDebug('dataset.updateDataset', payload);
    const datasetCategories = payload.categories || [];
    const { dataset } = payload;
    const editorFieldsInUse = getFieldsInUseFromSpec(
        dataset.fields,
        state.editorFieldsInUse
    );
    const editorFieldDatasetMismatch = doUnallocatedFieldsExist(
        dataset.fields,
        editorFieldsInUse,
        state.editorFieldDatasetMismatch
    );
    const templateExportMetadata = {
        ...state.templateExportMetadata,
        ...{
            dataset: getDatasetTemplateFields(payload.dataset.fields).map(
                (d) => {
                    const match = state.templateExportMetadata.dataset.find(
                        (ds) => ds.key === d.key
                    );
                    if (match) {
                        return {
                            ...match,
                            ...{
                                name: d.name,
                                namePlaceholder: d.namePlaceholder
                            }
                        };
                    }
                    return d;
                }
            )
        }
    };
    const specOptions = getSpecificationParseOptions(state);
    const spec = getParsedSpec(state.specification, specOptions, {
        ...specOptions,
        ...{
            datasetHash: payload.dataset.hashValue,
            values: payload.dataset.values
        }
    });
    logDebug('dataset.updateDataset persisting to store...');
    return {
        dataset: payload.dataset,
        datasetCategories,
        datasetProcessingStage: 'Processed',
        editorFieldDatasetMismatch,
        editorFieldsInUse,
        editorPaneWidth: getResizablePaneSize(
            state.editorPaneExpandedWidth,
            state.editorPaneIsExpanded,
            state.visualViewportCurrent,
            state.visualSettings.editor.position
        ),
        editorIsMapDialogVisible:
            !state.editorIsNewDialogVisible &&
            !state.editorIsExportDialogVisible &&
            editorFieldDatasetMismatch,
        specification: {
            ...state.specification,
            ...spec
        },
        templateExportMetadata,
        visualMode: resolveVisualMode(
            state.datasetViewHasValidMapping,
            state.visualEditMode,
            state.visualIsInFocusMode,
            state.visualViewMode,
            state.visualSettings.vega.jsonSpec
        )
    };
};

const handleResetDatasetLoadInformation = (
    state: TStoreState,
    canFetchMore: boolean
): Partial<TStoreState> => ({
    datasetCanFetchMore: canFetchMore,
    datasetRowsLoaded: 0,
    datasetWindowsLoaded: 0
});

const handleUpdateDataLoadInformation = (
    state: TStoreState,
    count: number
): Partial<TStoreState> => ({
    datasetRowsLoaded: state.datasetRowsLoaded + count,
    datasetWindowsLoaded: state.datasetWindowsLoaded + 1
});

const handleUpdateDatasetProcessingStage = (
    state: TStoreState,
    payload: IDatasetProcessingPayload
): Partial<TStoreState> => ({
    datasetCanFetchMore: payload.canFetchMore,
    datasetProcessingStage: payload.dataProcessingStage
});

const handleUpdateDatasetSelectors = (
    state: TStoreState,
    selectors: ISelectionId[]
): Partial<TStoreState> => {
    logDebug('dataset.updateDatasetSelectors', selectors);
    const values = state.dataset.values.slice().map((v) => ({
        ...v,
        ...(isCrossFilterPropSet() && {
            __selected__: getDataPointCrossFilterStatus(
                v?.[DATASET_IDENTITY_NAME],
                selectors
            )
        })
    }));
    const hashValue = getDatasetHash(state.dataset.fields, values);
    const specOptions = getSpecificationParseOptions(state);
    const spec = getParsedSpec(state.specification, specOptions, {
        ...specOptions,
        ...{
            datasetHash: hashValue,
            values
        }
    });
    return {
        datasetHasSelectionAborted: false,
        dataset: {
            ...state.dataset,
            ...{
                hashValue,
                values
            }
        },
        specification: {
            ...state.specification,
            ...spec
        }
    };
};

const handleUpdateDatasetSelectionAbortStatus = (
    state: TStoreState,
    status: boolean
): Partial<TStoreState> => ({
    datasetHasSelectionAborted: status
});

const handleUpdateDatasetViewFlags = (
    state: TStoreState,
    payload: IDataViewFlagsPayload
): Partial<TStoreState> => {
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
            state.visualSettings.vega.jsonSpec
        )
    };
};

const handleUpdateDatasetViewInvalid = (
    state: TStoreState
): Partial<TStoreState> => ({
    dataset: getEmptyDataset(),
    datasetProcessingStage: 'Processed',
    datasetRowsLoaded: 0,
    datasetWindowsLoaded: 0,
    visualMode: resolveVisualMode(
        state.datasetViewHasValidMapping,
        state.visualEditMode,
        state.visualIsInFocusMode,
        state.visualViewMode,
        state.visualSettings.vega.jsonSpec
    )
});
