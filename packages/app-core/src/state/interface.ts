import { type TemplateExportProcessingState } from '@deneb-viz/json-processing/template-processing';
import {
    type ContainerViewport,
    type InterfaceType,
    type ModalDialogRole
} from '../lib/interface';
import { type RemapState } from '@deneb-viz/json-processing/field-tracking';
import { StoreState } from './state';
import { isMappingDialogRequired } from '@deneb-viz/json-processing';
import { getNewUuid } from '@deneb-viz/utils/crypto';
import { StateCreator } from 'zustand';
import { getModalDialogRole } from '../lib/interface/state';

export type InterfaceSliceProperties = {
    /**
     * The viewport definitions for the interface container.
     */
    embedViewport: ContainerViewport | null;
    /**
     * The current state of the export processing.
     */
    exportProcessingState: TemplateExportProcessingState;
    /**
     * Whether the spec tokenization worker is currently processing. This is used to be able to update the
     * interface accordingly when this is in progress.
     */
    isTokenizingSpec: boolean;
    /**
     * Whether the field tracking worker is currently processing fields. This is used to be able to update the
     * interface accordingly when this is in progress.
     */
    isTrackingFields: boolean;
    /**
     * Current modal dialog display role. Used to display correct dialog to
     * the user (or not at all).
     */
    modalDialogRole: ModalDialogRole;
    /**
     * The current state of the remapping process.
     */
    remapState: RemapState;
    /**
     * Unique ID representing the current render operation. Used to ensure
     * that we can trigger a re-render of the Vega view for specific
     * conditions that sit outside the obvious triggers (e.g. data
     * changes).
     */
    renderId: string;
    type: InterfaceType;
    setEmbedViewport: (viewport: ContainerViewport) => void;
    /**
     * Sets the export processing state.
     */
    setExportProcessingState: (state: TemplateExportProcessingState) => void;
    /**
     * Signals that we should generate a new render ID for the current
     * specification.
     */
    generateRenderId: () => void;
    /**
     * Sets the tokenization state.
     */
    setIsTokenizingSpec: (isTokenizing: boolean) => void;
    /**
     * Sets the tracking field state.
     */
    setIsTrackingFields: (isTracking: boolean) => void;
    /**
     * Sets the role of the modal dialog to display.
     */
    setModalDialogRole: (role: ModalDialogRole) => void;
    /**
     * Sets the remap state.
     */
    setRemapState: (state: RemapState) => void;
    setType: (type: InterfaceType) => void;
};

export type InterfaceSlice = {
    interface: InterfaceSliceProperties;
};

export const createInterfaceSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        InterfaceSlice
    > =>
    (set) => ({
        interface: {
            embedViewport: null,
            exportProcessingState: 'None',
            isTokenizingSpec: false,
            isTrackingFields: false,
            modalDialogRole: 'None',
            remapState: 'None',
            renderId: getNewUuid(),
            type: 'viewer',
            generateRenderId: () =>
                set(
                    (state) => handleGenerateRenderId(state),
                    false,
                    'interface.generateRenderId'
                ),
            setEmbedViewport: (viewport: ContainerViewport) =>
                set(
                    (state) => ({
                        interface: {
                            ...state.interface,
                            embedViewport: viewport
                        }
                    }),
                    false,
                    'interface.setEmbedViewport'
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
                ),
            setType: (type: InterfaceType) =>
                set(
                    (state) => ({
                        interface: {
                            ...state.interface,
                            modalDialogRole: getModalDialogRole(
                                state.project.__isInitialized__,
                                type,
                                state.interface.modalDialogRole
                            ),
                            type
                        }
                    }),
                    false,
                    'interface.setType'
                )
        }
    });

/**
 * Sets the rejection state for a cross-filtering operation attempt.
 */
const handleGenerateRenderId = (state: StoreState): Partial<StoreState> => ({
    interface: { ...state.interface, renderId: getNewUuid() }
});

const handleSetExportProcessingState = (
    state: StoreState,
    exportProcessingState: TemplateExportProcessingState
): Partial<StoreState> => ({
    interface: { ...state.interface, exportProcessingState }
});

const handleSetIsTokenizingSpec = (
    state: StoreState,
    isTokenizing: boolean
): Partial<StoreState> => ({
    interface: { ...state.interface, isTokenizingSpec: isTokenizing }
});

const handleSetIsTrackingFields = (
    state: StoreState,
    isTracking: boolean
): Partial<StoreState> => ({
    interface: { ...state.interface, isTrackingFields: isTracking }
});

const handleSetModalDialogRole = (
    state: StoreState,
    role: ModalDialogRole
): Partial<StoreState> => ({
    interface: { ...state.interface, modalDialogRole: role }
});

const handleSetRemapState = (
    state: StoreState,
    remapState: RemapState
): Partial<StoreState> => {
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
              : getModalDialogRole(
                    state.project.__isInitialized__,
                    state.interface.type,
                    state.interface.modalDialogRole
                );
    return {
        interface: {
            ...state.interface,
            modalDialogRole,
            remapState
        }
    };
};
