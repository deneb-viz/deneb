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
         * Bumped, in the SAME `set()` call, every time
         * `initializeFromTemplate` runs — and by nothing else (not
         * `setContent`, not host sync via `syncProjectData`). This is the
         * only signal that distinguishes "a project was just created from
         * a template" from "content changed by Apply or by host sync",
         * used editor-side (U5,
         * docs/plans/2026-09-15-001-refactor-editor-package-extraction-plan.md)
         * to select the Spec pane and request editor focus after create,
         * without project.ts (core) knowing anything about panes or
         * focus. A monotonically increasing counter (rather than a
         * boolean or timestamp) so a subscriber can detect the signal via
         * simple inequality, the same reference-diffing pattern used for
         * every other slice-change subscription in this store.
         */
        initializationCount: number;
        /**
         * Bumped, in the SAME `set()` call, every time `initializeFromTemplate`
         * OR `setContent` runs — the two actions that commit new spec/config
         * text. Both of those actions used to call
         * `get().editor.updateChanges(...)` for BOTH roles UNCONDITIONALLY
         * on every call, regardless of whether the incoming text actually
         * differed from what was already staged (e.g. a template whose
         * config is the empty-object default, which is byte-identical to
         * `PROJECT_DEFAULTS.config`, must still stage that text). A
         * subscriber cannot reproduce "unconditionally, whenever this
         * specific action ran" by diffing `project.spec`/`project.config`
         * values — a coincidental value match (as above) would silently
         * skip the refresh. This counter is the same reference-diffing
         * discriminator pattern as `initializationCount`, scoped to the two
         * actions that must always refresh staged editor text; host sync
         * (`syncProjectData`), which never called `updateChanges`, does not
         * touch it.
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
                            // The editor-side subscription registered in
                            // `installEditorState` (U5) reads this
                            // transition to select the Spec pane and
                            // request focus; it replaces the direct
                            // `editorSelectedOperation: 'Spec'` write and
                            // the `get().editor.updateChanges(...)` calls
                            // that used to live in this action. Export
                            // metadata (previously also written here) is
                            // recomputed by the same editor-side
                            // subscription from the updated `project`
                            // slice, not by this core action.
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
                        // Staged editor text and export metadata (both
                        // previously written here) are refreshed by the
                        // editor-side subscriptions registered in
                        // `installEditorState` (U5): the staged-text
                        // subscription reacts to `contentCommitCount`, the
                        // export-metadata subscription to `project`/
                        // `dataset` changing.
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
                // Embedding `config` into export dataset entries (previously
                // done here) is now handled by the editor-side subscription
                // registered in `installEditorState` (U5), which reacts to
                // `project.supportFieldConfiguration` changing.
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
                // Embedding the stamped configuration into export dataset
                // entries (previously done here, same semantics as
                // setSupportFieldConfiguration) is now handled by the
                // editor-side subscription registered in
                // `installEditorState` (U5).
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
 * This updates the project slice with the incoming data. Export metadata
 * (previously also embedded/refreshed here) is recomputed by the editor-side
 * subscription registered in `installEditorState` (U5), which reacts to the
 * `project` slice changing — this keeps `syncProjectData` core-to-core.
 * Spec parsing is handled by the compilation slice via VisualViewer's useEffect.
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
