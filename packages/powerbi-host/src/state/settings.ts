import type { StateCreator } from 'zustand';
import { DenebVisualStoreState } from './state';
import {
    getVisualFormattingModel,
    HostSettingsModel
} from '../lib/persistence';

export type SettingsSlice = HostSettingsModel & {};

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
