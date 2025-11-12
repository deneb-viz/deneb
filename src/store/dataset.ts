import powerbi from 'powerbi-visuals-api';
import DataViewObjects = powerbi.DataViewObjects;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import ISelectionId = powerbi.visuals.ISelectionId;

import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import { TStoreState } from '.';
import { getEmptyDataset } from '../core/data/dataset';
import { TDataProcessingStage } from '../core/data';
import { getResizablePaneSize } from '../core/ui/advancedEditor';
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
import { getApplicationMode } from '../features/interface';
import { getHashValue } from '../utils';
import {
    areAllCreateDataRequirementsMet,
    getUpdatedExportMetadata
} from '@deneb-viz/json-processing';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { TEditorPosition } from '../core/ui';
import { ROW_IDENTITY_FIELD_NAME } from '@deneb-viz/dataset/field';
import { type IDataset } from '@deneb-viz/dataset/data';

export interface IDatasetSlice {
    dataset: IDataset;
    datasetCategories: DataViewCategoryColumn[];
    datasetHasHighlights: boolean;
    datasetHasSelectionAborted: boolean;
    datasetProcessingStage: TDataProcessingStage;
    datasetSelectionLimit: number;
    datasetViewObjects: DataViewObjects;
    updateDataset: (payload: IVisualDatasetUpdatePayload) => void;
    updateDatasetProcessingStage: (payload: IDatasetProcessingPayload) => void;
    updateDatasetSelectors: (selectors: ISelectionId[]) => void;
    updateDatasetSelectionAbortStatus: (
        payload: IVisualDatasetAbortPayload
    ) => void;
}

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <IDatasetSlice>{
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
    TStoreState,
    [['zustand/devtools', never]],
    [],
    IDatasetSlice
> = sliceStateInitializer;

interface IDatasetProcessingPayload {
    dataProcessingStage: TDataProcessingStage;
    rowsLoaded: number;
}

interface IVisualDatasetUpdatePayload {
    categories: DataViewCategoryColumn[];
    dataset: IDataset;
}

interface IVisualDatasetAbortPayload {
    status: boolean;
    limit: number;
}

// eslint-disable-next-line max-lines-per-function
const handleUpdateDataset = (
    state: TStoreState,
    payload: IVisualDatasetUpdatePayload
): Partial<TStoreState> => {
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
        specification: jsonSpec,
        updateType: state.visualUpdateOptions.type
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
            state.visualSettings.editor.json.position.value as TEditorPosition
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
    state: TStoreState,
    payload: IDatasetProcessingPayload
): Partial<TStoreState> => {
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
    state: TStoreState,
    selectors: ISelectionId[]
): Partial<TStoreState> => {
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
    state: TStoreState,
    payload: IVisualDatasetAbortPayload
): Partial<TStoreState> => ({
    datasetHasSelectionAborted: payload.status,
    datasetSelectionLimit: payload.limit
});
