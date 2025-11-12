import { NamedSet } from 'zustand/middleware';
import { StateCreator } from 'zustand';

import { TStoreState } from '.';
import { RemapState } from '@deneb-viz/core-dependencies';
import {
    areAllRemapDataRequirementsMet,
    getRemapEligibleFields,
    isMappingDialogRequired
} from '@deneb-viz/json-processing';
import { ModalDialogRole } from '../features/modal-dialog/types';
import { getOnboardingDialog } from '../features/modal-dialog';
import { isExportSpecCommandEnabled } from '../features/commands';
import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';
import {
    type FieldUsageSliceApplyFieldMapping,
    type FieldUsageSliceApplyTokenizationChanges,
    type FieldUsageSliceApplyTrackingChanges,
    type FieldUsageSliceSetFieldAssignment,
    type FieldUsageSliceState
} from '@deneb-viz/state';

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <FieldUsageSliceState>{
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
            tokenizedSpec: <unknown>null,
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
    };

export const createFieldUsageSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    FieldUsageSliceState
> = sliceStateInitializer;

/**
 * Ensure that the spec is updated and persisted once field mapping has been applied. This will also ensure that the
 * dialog has been dismissed.
 */
const handleApplyFieldMapping = (
    state: TStoreState,
    payload: FieldUsageSliceApplyFieldMapping
): Partial<TStoreState> => {
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
    state: TStoreState,
    payload: FieldUsageSliceApplyTokenizationChanges
): Partial<TStoreState> => {
    return {
        fieldUsage: {
            ...state.fieldUsage,
            tokenizedSpec: payload.tokenizedSpec
        },
        interface: { ...state.interface, isTokenizingSpec: false }
    };
};

const handleApplyTrackingChanges = (
    state: TStoreState,
    payload: FieldUsageSliceApplyTrackingChanges
): Partial<TStoreState> => {
    const { remapFields, trackedDrilldown, trackedFields } = payload;
    const {
        remapAllDependenciesAssigned,
        remapAllFieldsAssigned,
        remapDrilldownAssigned
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
            state.interface.remapState !== RemapState.Complete)
            ? 'Remap'
            : getOnboardingDialog(
                  state.visualSettings,
                  state.interface.mode,
                  state.interface.modalDialogRole
              );
    return {
        commands: {
            ...state.commands,
            exportSpecification: isExportSpecCommandEnabled({
                editorIsDirty: state.editor.isDirty,
                interfaceMode: state.interface.mode,
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
    state: TStoreState,
    payload: FieldUsageSliceSetFieldAssignment
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
