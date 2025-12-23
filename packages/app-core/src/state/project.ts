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

export type ProjectSliceProperties = {
    __hasHydrated__: boolean;
    logLevel: number;
    provider: SpecProvider | undefined;
    providerVersion?: string;
    renderMode: SpecRenderMode;
    setLogLevel: (logLevel: number) => void;
    syncProjectData: (payload: ProjectSyncPayload) => void;
    setProvider: (provider: SpecProvider | undefined) => void;
    setRenderMode: (renderMode: SpecRenderMode) => void;
};

/**
 * Used to hydrate or synchronize project data from/to a hosting application.
 */
export type ProjectSyncPayload = {
    logLevel: number;
    provider: SpecProvider | undefined;
    providerVersion: string | undefined;
    renderMode: SpecRenderMode;
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
    (set) => ({
        project: {
            __hasHydrated__: false,
            logLevel: PROJECT_DEFAULTS.logLevel,
            provider: undefined,
            providerVersion: undefined,
            renderMode: PROJECT_DEFAULTS.renderMode as SpecRenderMode,
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
): Partial<StoreState> => ({
    project: {
        ...state.project,
        __hasHydrated__: true,
        logLevel: payload.logLevel ?? state.project.logLevel,
        provider: payload.provider ?? state.project.provider,
        providerVersion:
            payload.providerVersion ?? state.project.providerVersion,
        renderMode: payload.renderMode ?? state.project.renderMode
    }
});
