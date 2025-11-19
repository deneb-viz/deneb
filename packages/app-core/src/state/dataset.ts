import powerbi from 'powerbi-visuals-api';
import { type StateCreator } from 'zustand';

import { getEmptyDataset, type IDataset } from '@deneb-viz/dataset/data';
import { type StoreState } from './state';
import { getParsedSpec } from '@deneb-viz/json-processing/spec-processing';
import { getSpecificationParseOptions } from './helpers';
import { getHashValue } from '@deneb-viz/utils/crypto';
import {
    getDatasetTemplateFieldsFromMetadata,
    ROW_IDENTITY_FIELD_NAME
} from '@deneb-viz/dataset/field';
import {
    getDataPointCrossFilterStatus,
    isCrossFilterPropSet
} from '@deneb-viz/powerbi-compat/interactivity';
import { logDebug, logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import {
    type EditorPanePosition,
    getApplicationMode,
    getResizablePaneSize
} from '../lib';
import {
    areAllCreateDataRequirementsMet,
    getUpdatedExportMetadata
} from '@deneb-viz/json-processing';
import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';

/**
 * Stages to within the store when processing data, and therefore give us some UI hooks for the end-user.
 */
export type DataProcessingStage =
    | 'Initial'
    | 'Fetching'
    | 'Processing'
    | 'Processed';

export type DatasetProcessingPayload = {
    dataProcessingStage: DataProcessingStage;
    rowsLoaded: number;
};

export type DatasetSlice = {
    dataset: IDataset;
    datasetCategories: powerbi.DataViewCategoryColumn[];
    datasetHasHighlights: boolean;
    datasetHasSelectionAborted: boolean;
    datasetProcessingStage: DataProcessingStage;
    datasetSelectionLimit: number;
    datasetViewObjects: powerbi.DataViewObjects;
    updateDataset: (payload: VisualDatasetUpdatePayload) => void;
    updateDatasetProcessingStage: (payload: DatasetProcessingPayload) => void;
    updateDatasetSelectors: (selectors: powerbi.visuals.ISelectionId[]) => void;
    updateDatasetSelectionAbortStatus: (
        payload: VisualDatasetAbortPayload
    ) => void;
};

export type VisualDatasetUpdatePayload = {
    categories: powerbi.DataViewCategoryColumn[];
    dataset: IDataset;
};

export type VisualDatasetAbortPayload = {
    status: boolean;
    limit: number;
};

export const createDatasetSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        DatasetSlice
    > =>
    (set) => ({
        dataset: getEmptyDataset(),
        datasetCategories: [],
        datasetHasHighlights: false,
        datasetHasSelectionAborted: false,
        datasetProcessingStage: 'Initial',
        datasetSelectionLimit: DEFAULTS.vega.selectionMaxDataPoints,
        datasetViewObjects: {},
        updateDataset: (payload) =>
            set(
                (state) => handleUpdateDataset(state, payload),
                false,
                'updateDataset'
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
        updateDatasetSelectionAbortStatus: (payload) =>
            set(
                (state) =>
                    handleUpdateDatasetSelectionAbortStatus(state, payload),
                false,
                'updateDatasetSelectionAbortStatus'
            )
    });

// eslint-disable-next-line max-lines-per-function
const handleUpdateDataset = (
    state: StoreState,
    payload: VisualDatasetUpdatePayload
): Partial<StoreState> => {
    logDebug('dataset.updateDataset', payload);
    const datasetCategories = payload.categories || [];
    const { dataset } = payload;
    const {
        metadataAllDependenciesAssigned = false,
        metadataAllFieldsAssigned = false
    } = areAllCreateDataRequirementsMet(state.create.metadata);
    const jsonSpec = state.visualSettings.vega.output.jsonSpec.value;
    const mode = getApplicationMode({
        currentMode: state.interface.mode,
        dataset,
        editMode: state.visualUpdateOptions.editMode,
        isInFocus: state.visualUpdateOptions.isInFocus,
        prevMode: state.interface.mode,
        prevUpdateType: state.visualUpdateOptions.type,
        specification: jsonSpec,
        updateType: state.visualUpdateOptions.type,
        viewMode: state.visualUpdateOptions.viewMode,
        visualUpdates: state.visualUpdates
    });
    const specOptions = getSpecificationParseOptions(state);
    const spec = getParsedSpec(state.specification, specOptions, {
        ...specOptions,
        ...{
            datasetHash: dataset.hashValue,
            visualMode: mode
        }
    });
    logTimeStart('dataset.updateDataset.getUpdatedExportMetadata');
    const exportMetadata = getUpdatedExportMetadata(
        state.export.metadata as UsermetaTemplate,
        {
            dataset: getDatasetTemplateFieldsFromMetadata(
                payload.dataset.fields
            ).map((d) => {
                const match = state.export.metadata?.dataset.find(
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
            })
        }
    );
    logTimeEnd('dataset.updateDataset.getUpdatedExportMetadata');
    logDebug('dataset.updateDataset persisting to store...');
    return {
        create: {
            ...state.create,
            metadataAllDependenciesAssigned,
            metadataAllFieldsAssigned
        },
        dataset,
        datasetCategories,
        datasetProcessingStage: 'Processed',
        debug: { ...state.debug, logAttention: spec.errors.length > 0 },
        editorPaneWidth: getResizablePaneSize(
            state.editorPaneExpandedWidth as number,
            state.editorPaneIsExpanded,
            state.visualViewportCurrent,
            state.visualSettings.editor.json.position
                .value as EditorPanePosition
        ),
        export: {
            ...state.export,
            metadata: exportMetadata
        },
        interface: {
            ...state.interface,
            mode
        },
        processing: {
            ...state.processing,
            shouldProcessDataset: false
        },
        specification: {
            ...state.specification,
            ...spec
        }
    };
};

const handleUpdateDatasetProcessingStage = (
    state: StoreState,
    payload: DatasetProcessingPayload
): Partial<StoreState> => {
    const { dataProcessingStage, rowsLoaded } = payload;
    const mode = getApplicationMode({
        invokeMode:
            dataProcessingStage === 'Fetching'
                ? dataProcessingStage
                : state.interface.mode
    });
    return {
        datasetProcessingStage: dataProcessingStage,
        dataset: {
            ...state.dataset,
            rowsLoaded
        },
        interface: {
            ...state.interface,
            isInitialized: true,
            mode
        }
    };
};

const handleUpdateDatasetSelectors = (
    state: StoreState,
    selectors: powerbi.visuals.ISelectionId[]
): Partial<StoreState> => {
    logDebug('dataset.updateDatasetSelectors', selectors);
    const values = state.dataset.values.slice().map((v) => {
        const isCrossFilterEligible = isCrossFilterPropSet({
            enableSelection:
                state.visualSettings.vega.interactivity.enableSelection.value
        });
        logDebug(
            'dataset.updateDatasetSelectors isCrossFilterEligible',
            v,
            isCrossFilterEligible
        );
        return {
            ...v,
            ...(isCrossFilterEligible &&
                {} && {
                    __selected__: getDataPointCrossFilterStatus(
                        v?.[ROW_IDENTITY_FIELD_NAME],
                        selectors
                    )
                })
        };
    });
    logDebug('dataset.updateDatasetSelectors values', values);
    const hashValue = getHashValue({ fields: state.dataset.fields, values });
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
    state: StoreState,
    payload: VisualDatasetAbortPayload
): Partial<StoreState> => ({
    datasetHasSelectionAborted: payload.status,
    datasetSelectionLimit: payload.limit
});
