import powerbi from 'powerbi-visuals-api';
import { type StateCreator } from 'zustand';

import {
    getEmptyDataset,
    type IDataset
} from '@deneb-viz/powerbi-compat/dataset';
import { type StoreState } from './state';
import { getParsedSpec } from '@deneb-viz/json-processing/spec-processing';
import { getSpecificationParseOptions } from './helpers';
import { getHashValue } from '@deneb-viz/utils/crypto';
import {
    getDatasetTemplateFieldsFromMetadata,
    ROW_INDEX_FIELD_NAME
} from '@deneb-viz/powerbi-compat/dataset';
import {
    isCrossFilterPropSet,
    type SelectorStatus
} from '@deneb-viz/powerbi-compat/interactivity';
import { logDebug, logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import { type EditorPanePosition } from '../lib';
import {
    areAllCreateDataRequirementsMet,
    getUpdatedExportMetadata
} from '@deneb-viz/json-processing';
import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { getResizablePaneSize } from '../lib/interface/layout';
import { getApplicationMode } from '../lib/interface/state';

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
    datasetHasHighlights: boolean;
    datasetProcessingStage: DataProcessingStage;
    datasetViewObjects: powerbi.DataViewObjects;
    updateDataset: (payload: VisualDatasetUpdatePayload) => void;
    updateDatasetProcessingStage: (payload: DatasetProcessingPayload) => void;
    updateDatasetSelectors: (selectorMap: SelectorStatus) => Promise<void>;
};

export type VisualDatasetUpdatePayload = {
    dataset: IDataset;
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
        datasetHasHighlights: false,
        datasetProcessingStage: 'Initial',
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
        updateDatasetSelectors: async (selectorMap) =>
            set(
                (state) => handleUpdateDatasetSelectors(state, selectorMap),
                false,
                'updateDatasetSelectors'
            )
    });

// eslint-disable-next-line max-lines-per-function
const handleUpdateDataset = (
    state: StoreState,
    payload: VisualDatasetUpdatePayload
): Partial<StoreState> => {
    logDebug('dataset.updateDataset', payload);
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
    selectorMap: SelectorStatus
): Partial<StoreState> => {
    logDebug('dataset.updateDatasetSelectors', selectorMap);
    const values = state.dataset.values.slice().map((v) => {
        const isCrossFilterEligible = isCrossFilterPropSet({
            enableSelection:
                state.visualSettings.vega.interactivity.enableSelection.value
        });
        return {
            ...v,
            ...(isCrossFilterEligible &&
                {} && {
                    __selected__:
                        selectorMap.get(v[ROW_INDEX_FIELD_NAME]) || 'neutral'
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
