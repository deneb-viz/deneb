import powerbi from 'powerbi-visuals-api';
import type { StateCreator } from 'zustand';
import { shallowEqual } from 'fast-equals';

import { VisualFormattingSettingsModel } from '@deneb-viz/powerbi-compat/properties';
import { type DenebVisualStoreState } from './state';
import {
    getUpdatedDisplayHistoryList,
    type DisplayHistoryRecord
} from '../lib/state';
import { isVisualUpdateTypeResizeEnd } from '@deneb-viz/powerbi-compat/visual-host';

export type UpdatesSlice = {
    count: number;
    history: DisplayHistoryRecord[];
    options: powerbi.extensibility.visual.VisualUpdateOptions | null;
    setVisualUpdateOptions: (payload: VisualUpdateDataPayload) => Promise<void>;
};

export type VisualUpdateDataPayload = {
    options: powerbi.extensibility.visual.VisualUpdateOptions;
    settings: VisualFormattingSettingsModel;
};

export const createUpdatesSlice = (): StateCreator<
    DenebVisualStoreState,
    [['zustand/devtools', never]],
    [],
    UpdatesSlice
> => {
    return (set, get) => ({
        count: 0,
        history: [],
        options: null,
        setVisualUpdateOptions: async (payload) => {
            const { options, settings } = payload;
            // Apply consistent updates we will always need
            {
                set(
                    (state) => {
                        const history = getUpdatedDisplayHistoryList(
                            state.updates.history,
                            payload
                        );
                        const mode = history[0]?.displayMode ?? 'initializing';
                        return {
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
            // Update embed viewport if needed
            {
                const { viewport } = options;
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
            }
        }
    });
};
