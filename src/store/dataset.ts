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
import { getApplicationMode } from '../features/interface';
import { ModalDialogRole } from '../features/modal-dialog/types';
import { getOnboardingDialog } from '../features/modal-dialog';
import { getHashValue } from '../utils';
import { PROPERTY_DEFAULTS } from '../../config';
import {
    areAllCreateDataRequirementsMet,
    areAllRemapDataRequirementsMet,
    getFieldsInUseFromSpecification,
    getRemapEligibleFields,
    getTokenizedSpec,
    isMappingDialogRequired
} from '@deneb-viz/json-processing';
import { IDataset } from '@deneb-viz/core-dependencies';

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
        datasetSelectionLimit: PROPERTY_DEFAULTS.vega.selectionMaxDataPoints,
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
    const jsonSpec = state.visualSettings.vega.jsonSpec;
    const mode = getApplicationMode({
        currentMode: state.interface.mode,
        dataset: payload.dataset,
        editMode: state.visualUpdateOptions.editMode,
        isInFocus: state.visualUpdateOptions.isInFocus,
        specification: jsonSpec,
        updateType: state.visualUpdateOptions.type
    });
    const specOptions = getSpecificationParseOptions(state);
    const spec = getParsedSpec(state.specification, specOptions, {
        ...specOptions,
        ...{
            datasetHash: payload.dataset.hashValue,
            visualMode: mode
        }
    });
    const tracking = getFieldsInUseFromSpecification({
        spec: jsonSpec,
        dataset,
        trackedFieldsCurrent: state.fieldUsage.dataset
    });
    const tokenizedSpec = getTokenizedSpec({
        textSpec: jsonSpec,
        trackedFields: tracking.trackedFields
    });
    const remapFields = getRemapEligibleFields(tracking.trackedFields);
    const {
        remapAllDependenciesAssigned,
        remapAllFieldsAssigned,
        remapDrilldownAssigned
    } = areAllRemapDataRequirementsMet({
        remapFields,
        drilldownProperties: tracking.trackedDrilldown
    });
    const modalDialogRole: ModalDialogRole = isMappingDialogRequired({
        trackedFields: tracking.trackedFields,
        drilldownProperties: tracking.trackedDrilldown
    })
        ? 'Remap'
        : getOnboardingDialog(
              state.visualSettings,
              mode,
              state.interface.modalDialogRole
          );
    logDebug('dataset.updateDataset persisting to store...');
    return {
        create: {
            ...state.create,
            metadataAllDependenciesAssigned,
            metadataAllFieldsAssigned
        },
        dataset: payload.dataset,
        datasetCategories,
        datasetProcessingStage: 'Processed',
        debug: { ...state.debug, logAttention: spec.errors.length > 0 },
        editorPaneWidth: getResizablePaneSize(
            state.editorPaneExpandedWidth,
            state.editorPaneIsExpanded,
            state.visualViewportCurrent,
            state.visualSettings.editor.position
        ),
        fieldUsage: {
            ...state.fieldUsage,
            dataset: tracking.trackedFields,
            drilldown: tracking.trackedDrilldown,
            remapFields,
            remapAllDependenciesAssigned,
            remapAllFieldsAssigned,
            remapDrilldownAssigned,
            tokenizedSpec
        },
        interface: {
            ...state.interface,
            modalDialogRole,
            mode
        },
        processing: {
            ...state.processing,
            shouldProcessDataset: false
        },
        specification: {
            ...state.specification,
            ...spec
        },
        templateExportMetadata
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
                v?.[DATASET_IDENTITY_NAME],
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
