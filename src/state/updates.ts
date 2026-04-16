import powerbi from 'powerbi-visuals-api';
import type { StateCreator } from 'zustand';
import { shallowEqual } from 'fast-equals';

import { DEFAULT_VIEWPORT_SCALE } from '@deneb-viz/configuration';
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
                        const isInFocus =
                            options.isInFocus ?? state.interface.isInFocus;
                        return {
                            dataset: {
                                ...state.dataset,
                                shouldProcess:
                                    isVisualUpdateTypeVolatile(options)
                            },
                            interface: {
                                ...state.interface,
                                isInFocus,
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
                            : viewport.width,
                    scale:
                        (viewport as { scale?: number }).scale ??
                        DEFAULT_VIEWPORT_SCALE
                };
                const scaleChanged =
                    embedViewport?.scale !== targetViewport.scale;
                if (
                    doesModeAllowEmbedViewportSet(mode) &&
                    !shallowEqual(embedViewport, targetViewport) &&
                    (isVisualUpdateTypeResizeEnd(options.type) ||
                        scaleChanged ||
                        !embedViewport)
                ) {
                    setEmbedViewport(targetViewport);
                } else if (scaleChanged && embedViewport) {
                    // Scale changed but viewport dimension update was
                    // blocked (e.g. editor mode). Update only the scale,
                    // preserving current dimensions.
                    setEmbedViewport({
                        ...embedViewport,
                        scale: targetViewport.scale
                    });
                }
                // Fallback: if we don't have a viewport ensure we have the latest viewport.
                // In editor/transition modes, prefer persisted dimensions over the live
                // viewport — Power BI reports full-screen dimensions during editor open.
                if (!get().interface.embedViewport) {
                    const usePersistedDimensions =
                        !doesModeAllowEmbedViewportSet(mode) &&
                        persistedViewport.height > 0 &&
                        persistedViewport.width > 0;
                    setEmbedViewport(
                        usePersistedDimensions
                            ? {
                                  height: persistedViewport.height,
                                  width: persistedViewport.width,
                                  scale: targetViewport.scale
                              }
                            : targetViewport
                    );
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
