import type { StateCreator } from 'zustand';
import { DenebVisualStoreState } from './state';
import {
    getVisualFormattingModel,
    VisualFormattingSettingsModel
} from '../lib/persistence';

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
