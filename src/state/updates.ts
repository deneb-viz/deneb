import powerbi from 'powerbi-visuals-api';
import type { StateCreator } from 'zustand';
import { shallowEqual } from 'fast-equals';

import { getVisualFormattingModel } from '../lib/persistence';
import { type DenebVisualStoreState } from './state';
import {
    doesModeAllowEmbedViewportSet,
    getUpdatedDisplayHistoryList,
    isVisualUpdateTypeResizeEnd,
    isVisualUpdateTypeVolatile,
    type DisplayHistoryRecord
} from '../lib/state';

export type UpdatesSlice = {
    __hydrated__: boolean;
    count: number;
    history: DisplayHistoryRecord[];
    options: powerbi.extensibility.visual.VisualUpdateOptions | null;
    setVisualUpdateOptions: (payload: VisualUpdateDataPayload) => Promise<void>;
};

export type VisualUpdateDataPayload = {
    options: powerbi.extensibility.visual.VisualUpdateOptions;
    isDeveloperMode: boolean;
};

export const createUpdatesSlice = (): StateCreator<
    DenebVisualStoreState,
    [['zustand/devtools', never]],
    [],
    UpdatesSlice
> => {
    return (set, get) => ({
        __hydrated__: false,
        count: 0,
        history: [],
        options: null,
        setVisualUpdateOptions: async (payload) => {
            const { options, isDeveloperMode } = payload;
            const settings = getVisualFormattingModel(options?.dataViews?.[0]);
            settings.resolveDeveloperSettings(isDeveloperMode);
            // Apply consistent updates we will always need
            {
                set(
                    (state) => {
                        const history = getUpdatedDisplayHistoryList(
                            state.updates.history,
                            {
                                options,
                                settings,
                                isFetchingAdditionalData:
                                    state.dataset.isFetchingAdditional
                            }
                        );
                        const mode = history[0]?.displayMode ?? 'initializing';
                        return {
                            dataset: {
                                ...state.dataset,
                                shouldProcess:
                                    isVisualUpdateTypeVolatile(options)
                            },
                            interface: {
                                ...state.interface,
                                mode
                            },
                            settings: {
                                ...state.settings,
                                ...settings
                            },
                            updates: {
                                ...state.updates,
                                __hydrated__: true,
                                count: state.updates.count + 1,
                                history,
                                options
                            }
                        };
                    },
                    false,
                    'updates.setVisualUpdateOptions'
                );
            }
            const { viewport } = options;
            // Update embed viewport if needed
            {
                const { embedViewport, mode, setEmbedViewport } =
                    get().interface;
                const parsedHeight = Number.parseFloat(
                    settings.stateManagement.viewport.viewportHeight.value
                );
                const parsedWidth = Number.parseFloat(
                    settings.stateManagement.viewport.viewportWidth.value
                );
                const persistedViewport = {
                    height: Number.isFinite(parsedHeight) ? parsedHeight : 0,
                    width: Number.isFinite(parsedWidth) ? parsedWidth : 0
                };
                // Use live viewport as primary, fall back to persisted values only if viewport is exactly 0
                const targetViewport = {
                    height:
                        viewport.height === 0
                            ? persistedViewport.height
                            : viewport.height,
                    width:
                        viewport.width === 0
                            ? persistedViewport.width
                            : viewport.width
                };
                if (
                    doesModeAllowEmbedViewportSet(mode, options.isInFocus) &&
                    !shallowEqual(embedViewport, targetViewport) &&
                    (isVisualUpdateTypeResizeEnd(options.type) ||
                        !embedViewport)
                ) {
                    setEmbedViewport(targetViewport);
                }
                // Fallback: if we don't have a viewport ensure we have the latest viewport
                if (!get().interface.embedViewport) {
                    setEmbedViewport(targetViewport);
                }
            }
            // Update interface viewport if needed
            {
                const {
                    mode,
                    viewport: currentViewport,
                    setViewport
                } = get().interface;
                if (
                    !shallowEqual(currentViewport, viewport) &&
                    mode === 'editor'
                ) {
                    setViewport(viewport);
                }
            }
        }
    });
};
