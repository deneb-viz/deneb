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
import {
    type ExportSpecCommandTestOptions,
    isExportSpecCommandEnabled,
    isZoomInCommandEnabled,
    isZoomOtherCommandsEnabled,
    isZoomOutCommandEnabled,
    type ZoomLevelCommandTestOptions,
    type ZoomOtherCommandTestOptions
} from '../lib';
import { getUpdatedExportMetadata } from '@deneb-viz/json-processing';
import { getParsedSpec } from '@deneb-viz/json-processing/spec-processing';
import { getSpecificationParseOptions } from './helpers';
import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { logDebug } from '@deneb-viz/utils/logging';

/**
 * Options for updating project content with spec parsing.
 */
type ContentUpdateOptions = {
    spec?: string;
    config?: string;
    provider?: SpecProvider;
    logLevel?: number;
};

/**
 * Shared logic to parse spec/config and update related state (commands, debug, export metadata).
 * Called by both setContent and syncProjectData to ensure consistent behavior.
 */
const getStateWithParsedSpec = (
    state: StoreState,
    updatedProject: DenebProject & {
        __hasHydrated__: boolean;
        __isInitialized__: boolean;
    },
    options: ContentUpdateOptions
): Pick<StoreState, 'commands' | 'debug' | 'export' | 'specification'> => {
    const newSpec = options.spec ?? state.project.spec;
    const newConfig = options.config ?? state.project.config;

    // Check if parsing is needed
    const specChanged = newSpec !== state.project.spec;
    const configChanged = newConfig !== state.project.config;
    const needsParsing = specChanged || configChanged;

    logDebug('getStateWithParsedSpec - change detection', {
        specChanged,
        configChanged,
        needsParsing
    });

    // Parse spec if needed
    const prevSpecOptions = getSpecificationParseOptions(state);
    const nextSpecOptions: typeof prevSpecOptions = {
        ...prevSpecOptions,
        config: newConfig,
        spec: newSpec,
        provider: (options.provider ?? updatedProject.provider) as SpecProvider,
        logLevel: options.logLevel ?? updatedProject.logLevel,
        viewportHeight: state.interface.embedViewport?.height ?? 0,
        viewportWidth: state.interface.embedViewport?.width ?? 0
    };

    const spec = needsParsing
        ? getParsedSpec(state.specification, prevSpecOptions, nextSpecOptions)
        : state.specification;

    logDebug('getStateWithParsedSpec - parse result', {
        specStatus: spec.status,
        needsParsing
    });

    // Update commands based on specification state
    const zoomOtherCommandTest: ZoomOtherCommandTestOptions = {
        specification: spec
    };
    const zoomLevelCommandTest: ZoomLevelCommandTestOptions = {
        value: state.editorZoomLevel,
        specification: spec
    };
    const exportSpecCommandTest: ExportSpecCommandTestOptions = {
        editorIsDirty:
            (state.editor.stagedSpec !== null &&
                state.editor.stagedSpec !== updatedProject.spec) ||
            (state.editor.stagedConfig !== null &&
                state.editor.stagedConfig !== updatedProject.config),
        specification: spec
    };

    // Update export metadata
    const exportMetadata = getUpdatedExportMetadata(
        state.export.metadata as UsermetaTemplate,
        {
            config:
                spec.status === 'valid'
                    ? updatedProject.config
                    : state.export.metadata?.config,
            provider: updatedProject.provider as SpecProvider,
            providerVersion: updatedProject.providerVersion,
            interactivity: updatedProject.interactivity
        }
    );

    return {
        commands: {
            ...state.commands,
            exportSpecification: isExportSpecCommandEnabled(
                exportSpecCommandTest
            ),
            zoomFit: isZoomOtherCommandsEnabled(zoomOtherCommandTest),
            zoomIn: isZoomInCommandEnabled(zoomLevelCommandTest),
            zoomOut: isZoomOutCommandEnabled(zoomLevelCommandTest),
            zoomReset: isZoomOtherCommandsEnabled(zoomLevelCommandTest)
        },
        debug: { ...state.debug, logAttention: spec.errors.length > 0 },
        export: {
            ...state.export,
            metadata: exportMetadata
        },
        specification: {
            ...state.specification,
            ...spec
        }
    };
};

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
            provider: undefined,
            providerVersion: undefined,
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
                        const parsedState = getStateWithParsedSpec(
                            state,
                            updatedProject,
                            {
                                spec: payload.spec,
                                config: payload.config,
                                provider
                            }
                        );
                        return {
                            ...parsedState,
                            editorSelectedOperation: 'Spec',
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
                        const parsedState = getStateWithParsedSpec(
                            state,
                            updatedProject,
                            { spec: payload.spec, config: payload.config }
                        );
                        return {
                            ...parsedState,
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

// eslint-disable-next-line max-lines-per-function
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

    // Use shared helper for spec parsing and related state updates
    const parsedState = getStateWithParsedSpec(state, updatedProject, {
        spec: payload.spec,
        config: payload.config,
        provider: payload.provider as SpecProvider,
        logLevel: payload.logLevel
    });

    return {
        ...parsedState,
        interface: {
            ...state.interface,
            modalDialogRole
        },
        project: updatedProject
    };
};
