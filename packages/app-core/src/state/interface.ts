import { type TemplateExportProcessingState } from '@deneb-viz/json-processing/template-processing';
import { EMBED_DEFAULTS } from '@deneb-viz/configuration';
import {
    type ContainerViewport,
    type InterfaceType,
    type ModalDialogRole
} from '../lib/interface';
import { type RemapState } from '@deneb-viz/json-processing/field-tracking';
import { StoreState } from './state';
import { isMappingDialogRequired } from '@deneb-viz/json-processing';
import { getParsedSpec } from '@deneb-viz/json-processing/spec-processing';
import { getNewUuid } from '@deneb-viz/utils/crypto';
import { StateCreator } from 'zustand';
import { getModalDialogRole } from '../lib/interface/state';
import { getSpecificationParseOptions } from './helpers';

export type InterfaceSliceProperties = {
    /**
     * Whether the embed container size is managed by the host application.
     * When true, the host is responsible for setting embedViewport dimensions.
     * When false, app-core will manage the container size internally.
     */
    embedContainerSetByHost: boolean;
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
    setEmbedContainerSetByHost: (setByHost: boolean) => void;
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
            embedContainerSetByHost: false,
            embedViewport: EMBED_DEFAULTS.viewport,
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
            setEmbedContainerSetByHost: (setByHost: boolean) =>
                set(
                    (state) => ({
                        interface: {
                            ...state.interface,
                            embedContainerSetByHost: setByHost
                        }
                    }),
                    false,
                    'interface.setEmbedContainerSetByHost'
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
                    (state) => {
                        // When transitioning between viewer/editor modes, we need to
                        // trigger a spec reparse to generate a new hashValue. This
                        // matches 1.8.2 behavior where mode changes triggered reparsing.
                        const typeChanged = type !== state.interface.type;

                        // Get the new specification by triggering a reparse with the
                        // new validateSchema value (which differs between viewer/editor)
                        let specData = {
                            errors: state.specification.errors,
                            hashValue: state.specification.hashValue,
                            spec: state.specification.spec,
                            status: state.specification.status,
                            warns: state.specification.warns
                        };
                        if (
                            typeChanged &&
                            state.specification.status === 'valid'
                        ) {
                            const prevOptions =
                                getSpecificationParseOptions(state);
                            const nextOptions = {
                                ...prevOptions,
                                validateSchema: type === 'editor'
                            };
                            const parsed = getParsedSpec(
                                state.specification,
                                prevOptions,
                                nextOptions
                            );
                            specData = {
                                errors: parsed.errors,
                                hashValue: parsed.hashValue,
                                spec: parsed.spec,
                                status: parsed.status,
                                warns: parsed.warns
                            };
                        }

                        return {
                            interface: {
                                ...state.interface,
                                modalDialogRole: getModalDialogRole(
                                    state.project.__isInitialized__,
                                    type,
                                    state.interface.modalDialogRole
                                ),
                                renderId: getNewUuid(),
                                type
                            },
                            specification: {
                                ...state.specification,
                                ...specData
                            }
                        };
                    },
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
