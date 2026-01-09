import { type StateCreator } from 'zustand';
import { type SyncableSlice, type StoreState } from './state';
import { VISUAL_RENDER_DEFAULTS } from '@deneb-viz/configuration';

export type VisualRenderSliceProperties = {
    scrollbarColor: string;
    scrollbarOpacity: number;
    scrollbarRadius: number;
    scrollEventThrottle: number;
};

export type VisualRenderSlice = {
    visualRender: SyncableSlice &
        VisualRenderSliceProperties & {
            syncPreferences: (payload: VisualRenderSyncPayload) => void;
        };
};

export type VisualRenderSyncPayload = VisualRenderSliceProperties;

export const createVisualRenderSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        VisualRenderSlice
    > =>
    (set) => ({
        visualRender: {
            __hasHydrated__: false,
            scrollbarColor: VISUAL_RENDER_DEFAULTS.scrollbarColor,
            scrollbarOpacity: VISUAL_RENDER_DEFAULTS.scrollbarOpacity.default,
            scrollbarRadius: VISUAL_RENDER_DEFAULTS.scrollbarRadius.default,
            scrollEventThrottle:
                VISUAL_RENDER_DEFAULTS.scrollEventThrottle.default,
            syncPreferences: (payload: VisualRenderSyncPayload) => {
                set((state) => handleSyncPreferences(state, payload), false, {
                    type: 'visualRender.syncPreferences'
                });
            }
        }
    });

const handleSyncPreferences = (
    state: StoreState,
    payload: VisualRenderSyncPayload
): Partial<StoreState> => {
    const definedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
    );
    return {
        visualRender: {
            ...state.visualRender,
            ...definedPayload,
            __hasHydrated__: true
        }
    };
};
