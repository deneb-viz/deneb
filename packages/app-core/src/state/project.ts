import { type StateCreator } from 'zustand';
import { type StoreState } from './state';
import {
    PROJECT_DEFAULTS,
    PROVIDER_VERSION_CONFIGURATION
} from '@deneb-viz/configuration';
import {
    type SpecProvider,
    type SpecRenderMode
} from '@deneb-viz/vega-runtime/embed';
import { isProjectInitialized, type DenebProject } from '../lib/project';
import { getModalDialogRole } from '../lib/interface/state';

export type ProjectSliceProperties = DenebProject & {
    __hasHydrated__: boolean;
    __isInitialized__: boolean;
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
            setContent: (payload: SetContentPayload) => {
                set(
                    (state) => ({
                        project: {
                            ...state.project,
                            spec: payload.spec,
                            config: payload.config
                        }
                    }),
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
                                ? PROVIDER_VERSION_CONFIGURATION[provider]
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

const handleSyncProjectData = (
    state: StoreState,
    payload: ProjectSyncPayload
): Partial<StoreState> => {
    // Filter out undefined values so we only override with defined properties
    const definedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
    );
    const __isInitialized__ = isProjectInitialized(payload);
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
        project: {
            ...state.project,
            ...definedPayload,
            __hasHydrated__: true,
            __isInitialized__
        }
    };
};
