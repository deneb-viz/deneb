import powerbi from 'powerbi-visuals-api';
import type { StateCreator } from 'zustand';
import { shallowEqual } from 'fast-equals';

import {
    getVisualFormattingModel,
    VisualFormattingSettingsModel
} from '@deneb-viz/powerbi-compat/properties';
import { type DenebVisualStoreState } from './state';
import {
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
                if (
                    mode !== 'editor' &&
                    mode !== 'transition-viewer-editor' &&
                    !shallowEqual(embedViewport, viewport) &&
                    (isVisualUpdateTypeResizeEnd(options.type) ||
                        !embedViewport)
                ) {
                    setEmbedViewport(viewport);
                }
                // Fallback: if we don't have a viewport ensure we have the latest viewport
                if (!get().interface.embedViewport) {
                    setEmbedViewport({
                        height: Number.parseFloat(
                            settings.stateManagement.viewport.viewportHeight
                                .value
                        ),
                        width: Number.parseFloat(
                            settings.stateManagement.viewport.viewportWidth
                                .value
                        )
                    });
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
