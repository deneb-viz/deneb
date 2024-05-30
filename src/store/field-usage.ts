import { NamedSet } from 'zustand/middleware';
import { StateCreator } from 'zustand';

import { TStoreState } from '.';
import {
    IFieldUsageSliceApplyFieldMapping,
    IFieldUsageSliceSetFieldAssignment,
    IFieldUsageSliceState,
    UsermetaDatasetField
} from '@deneb-viz/core-dependencies';
import {
    areAllRemapDataRequirementsMet,
    getRemapEligibleFields,
    getTokenizedSpec
} from '@deneb-viz/json-processing';
import { ModalDialogRole } from '../features/modal-dialog/types';

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <IFieldUsageSliceState>{
        fieldUsage: {
            dataset: {},
            drilldown: {
                isCurrent: false,
                isMappingRequired: false
            },
            editorShouldSkipRemap: false,
            isProcessing: false,
            remapFields: [],
            remapAllDependenciesAssigned: false,
            remapAllFieldsAssigned: false,
            remapDrilldownAssigned: false,
            tokenizedSpec: <unknown>null,
            applyFieldMapping: (payload) =>
                set(
                    (state) => handleApplyFieldMapping(state, payload),
                    false,
                    'fieldUsage.applyFieldMapping'
                ),
            setFieldAssignment: (payload) =>
                set(
                    (state) => handleSetFieldAssignment(state, payload),
                    false,
                    'fieldUsage.setFieldAssignment'
                ),
            setProcessingEnd: () =>
                set(
                    (state) => handleSetProcessingEnd(state),
                    false,
                    'fieldUsage.setProcessingEnd'
                ),
            setProcessingStart: () =>
                set(
                    (state) => handleSetProcessingStart(state),
                    false,
                    'fieldUsage.setProcessingStart'
                )
        }
    };

export const createFieldUsageSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    IFieldUsageSliceState
> = sliceStateInitializer;

/**
 * Ensure that the spec is updated and persisted once field mapping has been applied. This will also ensure that the
 * dialog has been dismissed.
 */
const handleApplyFieldMapping = (
    state: TStoreState,
    payload: IFieldUsageSliceApplyFieldMapping
): Partial<TStoreState> => {
    const tokenizedSpec = getTokenizedSpec({
        textSpec: payload.jsonSpec,
        trackedFields: state.fieldUsage.dataset,
        isRemap: true
    });
    const remapFields = getRemapEligibleFields(payload.dataset);
    const {
        remapAllDependenciesAssigned = false,
        remapAllFieldsAssigned = false,
        remapDrilldownAssigned = false
    } = areAllRemapDataRequirementsMet({
        remapFields,
        drilldownProperties: payload.drilldown
    });
    const modalDialogRole: ModalDialogRole = 'None';
    return {
        fieldUsage: {
            ...state.fieldUsage,
            dataset: payload.dataset,
            drilldown: payload.drilldown,
            editorShouldSkipRemap: true,
            remapFields,
            remapAllDependenciesAssigned,
            remapAllFieldsAssigned,
            remapDrilldownAssigned,
            tokenizedSpec
        },
        interface: { ...state.interface, modalDialogRole }
    };
};
/**
 * Updates the isProcessing flag to `false`, allowing the UI to update as needed.
 */
const handleSetProcessingEnd = (state: TStoreState): Partial<TStoreState> => {
    return { fieldUsage: { ...state.fieldUsage, isProcessing: false } };
};

/**
 * Updates the isProcessing flag to `true`, allowing the UI to update as needed.
 */
const handleSetProcessingStart = (state: TStoreState): Partial<TStoreState> => {
    return { fieldUsage: { ...state.fieldUsage, isProcessing: true } };
};

/**
 * For the given key, set its placeholder value to match the supplied dataset field.
 */
const handleSetFieldAssignment = (
    state: TStoreState,
    payload: IFieldUsageSliceSetFieldAssignment
): Partial<TStoreState> => {
    const { remapFields } = state.fieldUsage || {};
    if (remapFields) {
        const fieldIndex =
            remapFields.findIndex((ph) => ph.key === payload.key) ??
            remapFields.length;
        const remapFieldsNew: UsermetaDatasetField[] =
            fieldIndex === -1
                ? [...remapFields]
                : [
                      ...remapFields.slice(0, fieldIndex),
                      <UsermetaDatasetField>{
                          ...remapFields[fieldIndex],
                          suppliedObjectKey: payload.suppliedObjectKey,
                          suppliedObjectName: payload.suppliedObjectName
                      },
                      ...remapFields.slice(fieldIndex + 1, remapFields.length)
                  ];
        const {
            remapAllDependenciesAssigned = false,
            remapAllFieldsAssigned = false,
            remapDrilldownAssigned = false
        } = areAllRemapDataRequirementsMet({
            remapFields: remapFieldsNew,
            drilldownProperties: state.fieldUsage.drilldown
        });
        return {
            fieldUsage: {
                ...state.fieldUsage,
                remapFields: remapFieldsNew,
                remapAllDependenciesAssigned,
                remapAllFieldsAssigned,
                remapDrilldownAssigned
            }
        };
    }
};
