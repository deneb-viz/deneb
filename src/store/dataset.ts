import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;

import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import { getEmptyDataset } from '../core/data/dataset';
import {
    getDataPointCrossFilterStatus,
    isCrossFilterPropSet
} from '../features/interactivity';
import { getDatasetTemplateFields } from '../core/data/fields';
import {
    getParsedSpec,
    getSpecificationParseOptions
} from '../features/specification/logic';
import { logDebug, logTimeEnd, logTimeStart } from '../features/logging';
import { getHashValue } from '../utils';
import {
    areAllCreateDataRequirementsMet,
    getUpdatedExportMetadata
} from '@deneb-viz/json-processing';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { ROW_IDENTITY_FIELD_NAME } from '@deneb-viz/dataset/field';
import {
    type DatasetProcessingPayload,
    type DatasetSlice,
    type EditorPanePosition,
    type StoreState,
    type VisualDatasetAbortPayload,
    type VisualDatasetUpdatePayload,
    getApplicationMode,
    getResizablePaneSize
} from '@deneb-viz/app-core';

const sliceStateInitializer = (set: NamedSet<StoreState>) =>
    <DatasetSlice>{
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
    };

export const createDatasetSlice: StateCreator<
    StoreState,
    [['zustand/devtools', never]],
    [],
    DatasetSlice
> = sliceStateInitializer;

// eslint-disable-next-line max-lines-per-function
const handleUpdateDataset = (
    state: StoreState,
    payload: VisualDatasetUpdatePayload
): Partial<StoreState> => {
    logDebug('dataset.updateDataset', payload);
    const datasetCategories = payload.categories || [];
    const { dataset } = payload;
    const { metadataAllDependenciesAssigned, metadataAllFieldsAssigned } =
        areAllCreateDataRequirementsMet(state.create.metadata);
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
    const exportMetadata = getUpdatedExportMetadata(state.export.metadata, {
        dataset: getDatasetTemplateFields(payload.dataset.fields).map((d) => {
            const match = state.export.metadata.dataset.find(
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
    });
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
            state.editorPaneExpandedWidth,
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
    selectors: ISelectionId[]
): Partial<StoreState> => {
    logDebug('dataset.updateDatasetSelectors', selectors);
    const values = state.dataset.values.slice().map((v) => ({
        ...v,
        ...(isCrossFilterPropSet() && {
            __selected__: getDataPointCrossFilterStatus(
                v?.[ROW_IDENTITY_FIELD_NAME],
                selectors
            )
        })
    }));
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
