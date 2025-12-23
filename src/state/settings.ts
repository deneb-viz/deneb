import type { StateCreator } from 'zustand';
import { DenebVisualStoreState } from './state';
import {
    getVisualFormattingModel,
    VisualFormattingSettingsModel
} from '@deneb-viz/powerbi-compat/properties';

export type SettingsSlice = VisualFormattingSettingsModel & {};

export const createSettingsSlice = (): StateCreator<
    DenebVisualStoreState,
    [['zustand/devtools', never]],
    [],
    SettingsSlice
> => {
    return () => ({
        ...getVisualFormattingModel()
    });
};
