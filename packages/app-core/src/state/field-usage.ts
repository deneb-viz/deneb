import {
    areAllRemapDataRequirementsMet,
    getRemapEligibleFields,
    isMappingDialogRequired
} from '@deneb-viz/json-processing';
import {
    type TrackedDrilldownProperties,
    type TrackedFields,
    type TrackedFieldWorkingProperties
} from '@deneb-viz/json-processing/field-tracking';
import { type UsermetaDatasetField } from '@deneb-viz/data-core/field';
import { StoreState } from './state';
import { isExportSpecCommandEnabled, ModalDialogRole } from '../lib';
import { StateCreator } from 'zustand';
import { getModalDialogRole } from '../lib/interface/state';

/**
 * Represents the create slice in the visual store.
 */
export type FieldUsageSliceState = {
    fieldUsage: FieldUsageSliceProperties;
};

/**
 * Represents the create slice properties in the visual store.
 */
export type FieldUsageSliceProperties = TrackedFieldWorkingProperties & {
    applyFieldMapping: (payload: FieldUsageSliceApplyFieldMapping) => void;
    applyTokenizationChanges: (
        payload: FieldUsageSliceApplyTokenizationChanges
    ) => void;
    applyTrackingChanges: (
        payload: FieldUsageSliceApplyTrackingChanges
    ) => void;
    setFieldAssignment: (payload: FieldUsageSliceSetFieldAssignment) => void;
};

export const createFieldUsageSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        FieldUsageSliceState
    > =>
    (set) => ({
        fieldUsage: {
            dataset: {},
            drilldown: {
                isCurrent: false,
                isMappingRequired: false
            },
            editorShouldSkipRemap: false,
            remapFields: [],
            remapAllDependenciesAssigned: false,
            remapAllFieldsAssigned: false,
            remapDrilldownAssigned: false,
            tokenizedSpec: null,
            applyFieldMapping: (payload) =>
                set(
                    (state) => handleApplyFieldMapping(state, payload),
                    false,
                    'fieldUsage.applyFieldMapping'
                ),
            applyTokenizationChanges: (payload) =>
                set(
                    (state) => handleApplyTokenizationChanges(state, payload),
                    false,
                    'fieldUsage.applyTokenizationChanges'
                ),
            applyTrackingChanges: (payload) =>
                set(
                    (state) => handleApplyTrackingChanges(state, payload),
                    false,
                    'fieldUsage.applyTrackingChanges'
                ),
            setFieldAssignment: (payload) =>
                set(
                    (state) => handleSetFieldAssignment(state, payload),
                    false,
                    'fieldUsage.setFieldAssignment'
                )
        }
    });

/**
 * Represents the payload for tokenization changes.
 */
export type FieldUsageSliceApplyTokenizationChanges = {
    tokenizedSpec: string;
};

/**
 * Represents the payload for tracking changes.
 */
export type FieldUsageSliceApplyTrackingChanges = {
    trackedFields: TrackedFields;
    trackedDrilldown: TrackedDrilldownProperties;
    remapFields: UsermetaDatasetField[];
};

/**
 * Represents the payload for field mapping changes.
 */
export type FieldUsageSliceApplyFieldMapping = {
    dataset: TrackedFields;
    drilldown: TrackedDrilldownProperties;
};

/**
 * Represents the payload for a template field assignment.
 */
export type FieldUsageSliceSetFieldAssignment = {
    key: string;
    suppliedObjectKey: string | undefined;
    suppliedObjectName: string | undefined;
};

/**
 * Ensure that the spec is updated and persisted once field mapping has been applied. This will also ensure that the
 * dialog has been dismissed.
 */
const handleApplyFieldMapping = (
    state: StoreState,
    payload: FieldUsageSliceApplyFieldMapping
): Partial<StoreState> => {
    const remapFields = getRemapEligibleFields(payload.dataset);
    const {
        remapAllDependenciesAssigned = false,
        remapAllFieldsAssigned = false,
        remapDrilldownAssigned = false
    } = areAllRemapDataRequirementsMet({
        remapFields,
        drilldownProperties: payload.drilldown
    });
    return {
        fieldUsage: {
            ...state.fieldUsage,
            dataset: payload.dataset,
            drilldown: payload.drilldown,
            editorShouldSkipRemap: true,
            remapFields,
            remapAllDependenciesAssigned,
            remapAllFieldsAssigned,
            remapDrilldownAssigned
        },
        interface: {
            ...state.interface
        }
    };
};

const handleApplyTokenizationChanges = (
    state: StoreState,
    payload: FieldUsageSliceApplyTokenizationChanges
): Partial<StoreState> => {
    return {
        fieldUsage: {
            ...state.fieldUsage,
            tokenizedSpec: payload.tokenizedSpec
        },
        interface: { ...state.interface, isTokenizingSpec: false }
    };
};

const handleApplyTrackingChanges = (
    state: StoreState,
    payload: FieldUsageSliceApplyTrackingChanges
): Partial<StoreState> => {
    const { remapFields, trackedDrilldown, trackedFields } = payload;
    const {
        remapAllDependenciesAssigned = false,
        remapAllFieldsAssigned = false,
        remapDrilldownAssigned = false
    } = areAllRemapDataRequirementsMet({
        remapFields,
        drilldownProperties: trackedDrilldown
    });
    const modalDialogRole: ModalDialogRole =
        isMappingDialogRequired({
            trackedFields,
            drilldownProperties: trackedDrilldown
        }) ||
        (state.interface.modalDialogRole === 'Remap' &&
            state.interface.remapState !== 'Complete')
            ? 'Remap'
            : getModalDialogRole(
                  state.visualSettings,
                  state.interface.type,
                  state.interface.modalDialogRole
              );
    return {
        commands: {
            ...state.commands,
            exportSpecification: isExportSpecCommandEnabled({
                editorIsDirty: state.editor.isDirty,
                specification: state.specification
            })
        },
        fieldUsage: {
            ...state.fieldUsage,
            dataset: trackedFields,
            drilldown: trackedDrilldown,
            remapFields,
            remapAllDependenciesAssigned,
            remapAllFieldsAssigned,
            remapDrilldownAssigned
        },
        interface: {
            ...state.interface,
            isTrackingFields: false,
            modalDialogRole
        }
    };
};

/**
 * For the given key, set its placeholder value to match the supplied dataset field.
 */
const handleSetFieldAssignment = (
    state: StoreState,
    payload: FieldUsageSliceSetFieldAssignment
): Partial<StoreState> => {
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
    return {};
};
