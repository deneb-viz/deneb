import { type StateCreator } from 'zustand';
import { type SyncableSlice, type CoreStoreState } from './state';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import {
    getVegaVersion,
    type SpecProvider,
    type SpecRenderMode
} from '@deneb-viz/vega-runtime/embed';
import { isProjectInitialized, type DenebProject } from '../lib/project';
import { getModalDialogRole } from '../lib/interface/modal-dialog-role';
import { TEMPLATE_USERMETA_VERSION } from '@deneb-viz/template-usermeta';
import { logDebug } from '@deneb-viz/utils/logging';
import { type SupportFieldConfiguration } from '@deneb-viz/data-core/support-fields';

export type ProjectSliceProperties = SyncableSlice &
    DenebProject & {
        __isInitialized__: boolean;
        /**
         * Incremented only by `initializeFromTemplate`. The editor
         * subscribes to it to select the Spec pane and request focus.
         */
        initializationCount: number;
        /**
         * Incremented by `initializeFromTemplate` and `setContent`. The
         * editor subscribes to it to refresh staged Spec/Config text —
         * value-diffing `spec`/`config` cannot distinguish identical text
         * (e.g. a template's config matching the empty-object default)
         * from text that was never staged.
         */
        contentCommitCount: number;
        initializeFromTemplate: (
            payload: InitializeFromTemplatePayload
        ) => void;
        setContent: (payload: SetContentPayload) => void;
        setLogLevel: (logLevel: number) => void;
        setIsInitialized: (isInitialized: boolean) => void;
        setProvider: (provider: SpecProvider | undefined) => void;
        setRenderMode: (renderMode: SpecRenderMode) => void;
        setSupportFieldConfiguration: (
            config: SupportFieldConfiguration
        ) => void;
        setDenebMetaVersion: (version: number) => void;
        applySupportFieldMigrationStamp: (
            payload: SupportFieldMigrationStampPayload
        ) => void;
        setScaleToZoom: (scaleToZoom: boolean) => void;
        setConsolidateFieldParameters: (value: boolean) => void;
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
    /**
     * Support field configuration remapped from template placeholders to actual field names.
     * Optional — when absent the project starts with an empty configuration (defaults apply).
     */
    supportFieldConfiguration?: SupportFieldConfiguration;
    /**
     * The template's deneb.metaVersion. Used to stamp the persisted
     * denebMetaVersion so that legacy templates (metaVersion < 2) trigger
     * migration on first dataset processing.
     */
    denebMetaVersion?: number;
    /** When true, enable field parameter consolidation for this project. */
    consolidateFieldParameters?: boolean;
};

export type SetContentPayload = {
    spec: string;
    config: string;
};

/**
 * Payload for committing the one-time legacy support-field migration in a
 * SINGLE store update. The dataset mapping pass (the class
 * `'first-dataview'` execution point for the migration registry in the
 * hosting visual) computes all three values and commits them together so
 * the app-core → host sync subscriber observes ONE slice change and emits
 * ONE batched persist — three separate setter calls would emit three
 * non-atomic host persists, and a session ending between them leaves a
 * half-committed migration (M10).
 */
export type SupportFieldMigrationStampPayload = {
    supportFieldConfiguration: SupportFieldConfiguration;
    denebMetaVersion: number;
    consolidateFieldParameters: boolean;
};

export type ProjectSlice = {
    project: ProjectSliceProperties;
};

export const createProjectSlice =
    (): StateCreator<
        CoreStoreState,
        [['zustand/devtools', never]],
        [],
        ProjectSlice
    > =>
    (set) => ({
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
            supportFieldConfiguration: {},
            denebMetaVersion: 0,
            scaleToZoom: false,
            consolidateFieldParameters: true,
            initializationCount: 0,
            contentCommitCount: 0,
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
                            supportFieldConfiguration:
                                payload.supportFieldConfiguration ?? {},
                            denebMetaVersion:
                                payload.denebMetaVersion ??
                                TEMPLATE_USERMETA_VERSION,
                            consolidateFieldParameters:
                                payload.consolidateFieldParameters ??
                                state.project.consolidateFieldParameters,
                            __hasHydrated__: state.project.__hasHydrated__,
                            __isInitialized__: true,
                            // Bumped in this SAME set() call — see the
                            // doc comment on `initializationCount` above.
                            initializationCount:
                                state.project.initializationCount + 1,
                            // See the doc comment on `contentCommitCount`
                            // above — this and `setContent` are the two
                            // actions that must unconditionally refresh
                            // staged editor text.
                            contentCommitCount:
                                state.project.contentCommitCount + 1
                        };
                        return {
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
            },
            setContent: (payload: SetContentPayload) => {
                set(
                    (state) => {
                        const updatedProject = {
                            ...state.project,
                            spec: payload.spec,
                            config: payload.config,
                            __hasHydrated__: state.project.__hasHydrated__,
                            __isInitialized__: state.project.__isInitialized__,
                            // See the doc comment on `contentCommitCount`
                            // on the slice type above.
                            contentCommitCount:
                                state.project.contentCommitCount + 1
                        };
                        return {
                            project: updatedProject
                        };
                    },
                    false,
                    'project.setContent'
                );
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
            setSupportFieldConfiguration: (config: SupportFieldConfiguration) =>
                set(
                    (state) => ({
                        project: {
                            ...state.project,
                            supportFieldConfiguration: config
                        }
                    }),
                    false,
                    'project.setSupportFieldConfiguration'
                ),
            setDenebMetaVersion: (version: number) =>
                set(
                    (state) => ({
                        project: {
                            ...state.project,
                            denebMetaVersion: version
                        }
                    }),
                    false,
                    'project.setDenebMetaVersion'
                ),
            applySupportFieldMigrationStamp: (
                payload: SupportFieldMigrationStampPayload
            ) =>
                set(
                    (state) => ({
                        project: {
                            ...state.project,
                            supportFieldConfiguration:
                                payload.supportFieldConfiguration,
                            denebMetaVersion: payload.denebMetaVersion,
                            consolidateFieldParameters:
                                payload.consolidateFieldParameters
                        }
                    }),
                    false,
                    'project.applySupportFieldMigrationStamp'
                ),
            setScaleToZoom: (scaleToZoom: boolean) =>
                set(
                    (state) => ({
                        project: {
                            ...state.project,
                            scaleToZoom
                        }
                    }),
                    false,
                    'project.setScaleToZoom'
                ),
            setConsolidateFieldParameters: (
                consolidateFieldParameters: boolean
            ) =>
                set(
                    (state) => ({
                        project: {
                            ...state.project,
                            consolidateFieldParameters
                        }
                    }),
                    false,
                    'project.setConsolidateFieldParameters'
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
 * This updates the project slice with the incoming data. Spec parsing is
 * handled by the compilation slice via VisualViewer's useEffect.
 */
const handleSyncProjectData = (
    state: CoreStoreState,
    payload: ProjectSyncPayload
): Partial<CoreStoreState> => {
    logDebug('project.syncProjectData', payload);

    const definedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
    );

    // Build the updated (merged) project state FIRST, so initialization is
    // computed on the merged result rather than the partial sync payload
    // (M12): a partial payload leaves unrelated keys `undefined`, and
    // `undefined !== default` made ANY partial sync (e.g. logLevel only)
    // flip `__isInitialized__` to true on a brand-new visual, suppressing
    // the Create-dialog auto-open.
    const updatedProject = {
        ...state.project,
        ...definedPayload,
        __hasHydrated__: true
    };
    const __isInitialized__ = isProjectInitialized(updatedProject);
    updatedProject.__isInitialized__ = __isInitialized__;
    const modalDialogRole = getModalDialogRole(
        __isInitialized__,
        state.interface.type,
        state.interface.modalDialogRole
    );

    return {
        interface: {
            ...state.interface,
            modalDialogRole
        },
        project: updatedProject
    };
};
