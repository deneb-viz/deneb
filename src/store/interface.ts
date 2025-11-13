import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import { TStoreState } from '.';
import { isMappingDialogRequired } from '@deneb-viz/json-processing';
import { getOnboardingDialog } from '../features/modal-dialog';
import { getNewUuid } from '@deneb-viz/utils/crypto';
import { TemplateExportProcessingState } from '@deneb-viz/json-processing/template-processing';
import { type RemapState } from '@deneb-viz/json-processing/field-tracking';
import { type ModalDialogRole, type InterfaceSlice } from '@deneb-viz/app-core';

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <InterfaceSlice>{
        interface: {
            exportProcessingState: 'None',
            isInitialized: false,
            isTokenizingSpec: false,
            isTrackingFields: false,
            mode: 'Initializing',
            modalDialogRole: 'None',
            remapState: 'None',
            renderId: getNewUuid(),
            generateRenderId: () =>
                set(
                    (state) => handleGenerateRenderId(state),
                    false,
                    'interface.generateRenderId'
                ),
            setExplicitInitialize: () =>
                set(
                    (state) => handleSetExplicitInitialize(state),
                    false,
                    'interface.setExplicitInitialize'
                ),
            setExportProcessingState: (
                exportProcessingState: TemplateExportProcessingState
            ) =>
                set(
                    (state) =>
                        handleSetExportProcessingState(
                            state,
                            exportProcessingState
                        ),
                    false,
                    'interface.setExportProcessingState'
                ),
            setIsTokenizingSpec: (isTokenizing: boolean) =>
                set(
                    (state) => handleSetIsTokenizingSpec(state, isTokenizing),
                    false,
                    'interface.setIsTokenizingSpec'
                ),
            setIsTrackingFields: (isTracking: boolean) =>
                set(
                    (state) => handleSetIsTrackingFields(state, isTracking),
                    false,
                    'interface.setIsTrackingFields'
                ),
            setModalDialogRole: (role: ModalDialogRole) =>
                set(
                    (state) => handleSetModalDialogRole(state, role),
                    false,
                    'interface.setModalDialogRole'
                ),
            setRemapState: (remapState: RemapState) =>
                set(
                    (state) => handleSetRemapState(state, remapState),
                    false,
                    'interface.setRemapState'
                )
        }
    };

export const createInterfaceSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    InterfaceSlice
> = sliceStateInitializer;

/**
 * Sets the rejection state for a cross-filtering operation attempt.
 */
const handleGenerateRenderId = (state: TStoreState): Partial<TStoreState> => ({
    interface: { ...state.interface, renderId: getNewUuid() }
});

const handleSetExportProcessingState = (
    state: TStoreState,
    exportProcessingState: TemplateExportProcessingState
): Partial<TStoreState> => ({
    interface: { ...state.interface, exportProcessingState }
});

const handleSetIsTokenizingSpec = (
    state: TStoreState,
    isTokenizing: boolean
): Partial<TStoreState> => ({
    interface: { ...state.interface, isTokenizingSpec: isTokenizing }
});

const handleSetIsTrackingFields = (
    state: TStoreState,
    isTracking: boolean
): Partial<TStoreState> => ({
    interface: { ...state.interface, isTrackingFields: isTracking }
});

const handleSetModalDialogRole = (
    state: TStoreState,
    role: ModalDialogRole
): Partial<TStoreState> => ({
    interface: { ...state.interface, modalDialogRole: role }
});

const handleSetRemapState = (
    state: TStoreState,
    remapState: RemapState
): Partial<TStoreState> => {
    const modalDialogRole: ModalDialogRole =
        state.interface.modalDialogRole === 'Remap' &&
        remapState === 'None' &&
        state.interface.remapState > 'None'
            ? 'None'
            : isMappingDialogRequired({
                    trackedFields: state.fieldUsage.dataset,
                    drilldownProperties: state.fieldUsage.drilldown
                })
              ? 'Remap'
              : getOnboardingDialog(
                    state.visualSettings,
                    state.interface.mode,
                    state.interface.modalDialogRole
                );
    console.log('modalDialogRole', modalDialogRole);
    return {
        interface: {
            ...state.interface,
            modalDialogRole,
            remapState
        }
    };
};

/**
 * Explicitly set the visual as initialized and set the mode to `Landing`.
 */
const handleSetExplicitInitialize = (
    state: TStoreState
): TStoreState | Partial<TStoreState> => ({
    interface: {
        ...state.interface,
        isInitialized: true,
        mode: 'Landing'
    }
});
