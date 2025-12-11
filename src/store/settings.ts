import type { StateCreator } from 'zustand';
import { DenebVisualStoreState } from './state';
import {
    getVisualFormattingModel,
    VisualFormattingSettingsModel
} from '@deneb-viz/powerbi-compat/properties';

export type SettingsSlice = VisualFormattingSettingsModel & {
    setVisualSettings: (settings: VisualFormattingSettingsModel) => void;
};

export const createSettingsSlice = (): StateCreator<
    DenebVisualStoreState,
    [['zustand/devtools', never]],
    [],
    SettingsSlice
> => {
    return (set) => ({
        ...getVisualFormattingModel(),
        setVisualSettings: (settings) =>
            set(
                (state) => {
                    return {
                        settings: {
                            ...state.settings,
                            ...settings
                        }
                    };
                },
                false,
                'settings.setVisualSettings'
            )
    });
};
