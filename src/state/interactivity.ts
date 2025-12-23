import type { StateCreator } from 'zustand';
import { DenebVisualStoreState } from './state';

export type InteractivitySlice = {
    selectionLimitExceeded: boolean;
    setSelectionLimitExceeded: (exceeded: boolean) => Promise<void>;
};

export const createInteractivitySlice = (): StateCreator<
    DenebVisualStoreState,
    [['zustand/devtools', never]],
    [],
    InteractivitySlice
> => {
    return (set) => ({
        selectionLimitExceeded: false,
        setSelectionLimitExceeded: async (exceeded: boolean) => {
            set(
                (state) => ({
                    interactivity: {
                        ...state.interactivity,
                        selectionLimitExceeded: exceeded
                    }
                }),
                false,
                'interactivity.setSelectionLimitExceeded'
            );
        }
    });
};
