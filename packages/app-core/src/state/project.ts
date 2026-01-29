import { type StateCreator } from 'zustand';
import { type SyncableSlice, type StoreState } from './state';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import {
    getVegaVersion,
    type SpecProvider,
    type SpecRenderMode
} from '@deneb-viz/vega-runtime/embed';
import { isProjectInitialized, type DenebProject } from '../lib/project';
import { getModalDialogRole } from '../lib/interface/state';
import { getUpdatedExportMetadata } from '@deneb-viz/json-processing';
import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { logDebug } from '@deneb-viz/utils/logging';

export type ProjectSliceProperties = SyncableSlice &
    DenebProject & {
        __isInitialized__: boolean;
        initializeFromTemplate: (
            payload: InitializeFromTemplatePayload
        ) => void;
        setContent: (payload: SetContentPayload) => void;
        setLogLevel: (logLevel: number) => void;
        setIsInitialized: (isInitialized: boolean) => void;
        setProvider: (provider: SpecProvider | undefined) => void;
        setRenderMode: (renderMode: SpecRenderMode) => void;
        syncProjectData: (payload: ProjectSyncPayload) => void;
    };

/**
 * Used to hydrate or synchronize project data from/to a hosting application.
 */
export type ProjectSyncPayload = DenebProject;

/**
 * Payload for initializing a project from a template.
 */
export type InitializeFromTemplatePayload = {
    spec: string;
    config: string;
    provider: SpecProvider;
    renderMode?: SpecRenderMode;
};

export type SetContentPayload = {
    spec: string;
    config: string;
};

export type ProjectSlice = {
    project: ProjectSliceProperties;
};

export const createProjectSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        ProjectSlice
    > =>
    (set, get) => ({
        project: {
            __hasHydrated__: false,
            __isInitialized__: false,
            config: PROJECT_DEFAULTS.config,
            logLevel: PROJECT_DEFAULTS.logLevel,
            provider: PROJECT_DEFAULTS.provider as SpecProvider,
            providerVersion: getVegaVersion(
                PROJECT_DEFAULTS.provider as SpecProvider
            ),
            renderMode: PROJECT_DEFAULTS.renderMode as SpecRenderMode,
            spec: PROJECT_DEFAULTS.spec,
            initializeFromTemplate: (
                payload: InitializeFromTemplatePayload
            ) => {
                const provider = payload.provider;
                const providerVersion = provider
                    ? getVegaVersion(provider)
                    : undefined;
                const renderMode =
                    payload.renderMode ??
                    (PROJECT_DEFAULTS.renderMode as SpecRenderMode);
                set(
                    (state) => {
                        const updatedProject = {
                            ...state.project,
                            spec: payload.spec,
                            config: payload.config,
                            provider,
                            providerVersion,
                            renderMode,
                            __hasHydrated__: state.project.__hasHydrated__,
                            __isInitialized__: true
                        };
                        // Update export metadata for template creation
                        const exportMetadata = getUpdatedExportMetadata(
                            state.export.metadata as UsermetaTemplate,
                            {
                                config: payload.config,
                                provider,
                                providerVersion,
                                interactivity: updatedProject.interactivity
                            }
                        );
                        return {
                            editorSelectedOperation: 'Spec',
                            export: {
                                ...state.export,
                                metadata: exportMetadata
                            },
                            interface: {
                                ...state.interface,
                                modalDialogRole: 'None'
                            },
                            project: updatedProject
                        };
                    },
                    false,
                    'project.initializeFromTemplate'
                );
                get().editor.updateChanges({
                    role: 'Spec',
                    text: payload.spec
                });
                get().editor.updateChanges({
                    role: 'Config',
                    text: payload.config
                });
            },
            setContent: (payload: SetContentPayload) => {
                set(
                    (state) => {
                        const updatedProject = {
                            ...state.project,
                            spec: payload.spec,
                            config: payload.config,
                            __hasHydrated__: state.project.__hasHydrated__,
                            __isInitialized__: state.project.__isInitialized__
                        };
                        // Update export metadata
                        const exportMetadata = getUpdatedExportMetadata(
                            state.export.metadata as UsermetaTemplate,
                            {
                                config: payload.config,
                                provider: updatedProject.provider as SpecProvider,
                                providerVersion: updatedProject.providerVersion,
                                interactivity: updatedProject.interactivity
                            }
                        );
                        return {
                            export: {
                                ...state.export,
                                metadata: exportMetadata
                            },
                            project: updatedProject
                        };
                    },
                    false,
                    'project.setContent'
                );
                get().editor.updateChanges({
                    role: 'Spec',
                    text: payload.spec
                });
                get().editor.updateChanges({
                    role: 'Config',
                    text: payload.config
                });
            },
            setLogLevel: (logLevel: number) =>
                set(
                    (state) => ({
                        project: {
                            ...state.project,
                            logLevel
                        }
                    }),
                    false,
                    'project.setLogLevel'
                ),
            setIsInitialized: (isInitialized: boolean) =>
                set(
                    (state) => ({
                        project: {
                            ...state.project,
                            __isInitialized__: isInitialized
                        }
                    }),
                    false,
                    'project.setIsInitialized'
                ),
            setProvider: (provider: SpecProvider | undefined) =>
                set(
                    (state) => ({
                        project: {
                            ...state.project,
                            provider,
                            providerVersion: provider
                                ? getVegaVersion(provider)
                                : undefined
                        }
                    }),
                    false,
                    'project.setProvider'
                ),
            setRenderMode: (renderMode: SpecRenderMode) =>
                set(
                    (state) => ({
                        project: {
                            ...state.project,
                            renderMode
                        }
                    }),
                    false,
                    'project.setRenderMode'
                ),
            syncProjectData: (payload: ProjectSyncPayload) =>
                set(
                    (state) => handleSyncProjectData(state, payload),
                    false,
                    'project.syncProjectData'
                )
        }
    });

/**
 * Handle synchronization of project data from host application (e.g., Power BI).
 * This updates the project slice with the incoming data and export metadata.
 * Spec parsing is handled by the compilation slice via VisualViewer's useEffect.
 */
const handleSyncProjectData = (
    state: StoreState,
    payload: ProjectSyncPayload
): Partial<StoreState> => {
    logDebug('project.syncProjectData', payload);

    const definedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
    );
    const __isInitialized__ = isProjectInitialized(payload);
    const modalDialogRole = getModalDialogRole(
        __isInitialized__,
        state.interface.type,
        state.interface.modalDialogRole
    );

    // Build the updated project state
    const updatedProject = {
        ...state.project,
        ...definedPayload,
        __hasHydrated__: true,
        __isInitialized__
    };

    // Update export metadata for template export functionality
    const exportMetadata = getUpdatedExportMetadata(
        state.export.metadata as UsermetaTemplate,
        {
            config: payload.config ?? state.export.metadata?.config,
            provider: updatedProject.provider as SpecProvider,
            providerVersion: updatedProject.providerVersion,
            interactivity: updatedProject.interactivity
        }
    );

    return {
        export: {
            ...state.export,
            metadata: exportMetadata
        },
        interface: {
            ...state.interface,
            modalDialogRole
        },
        project: updatedProject
    };
};
