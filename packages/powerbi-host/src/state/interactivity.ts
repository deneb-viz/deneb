import type { StateCreator } from 'zustand';
import { DenebVisualStoreState } from './state';

export type InteractivitySlice = {
    selectionLimitExceeded: boolean;
    selectionLimit: number | undefined;
    setSelectionLimitExceeded: (exceeded: boolean, limit?: number) => void;
};

export const createInteractivitySlice = (): StateCreator<
    DenebVisualStoreState,
    [['zustand/devtools', never]],
    [],
    InteractivitySlice
> => {
    return (set) => ({
        selectionLimitExceeded: false,
        selectionLimit: undefined,
        setSelectionLimitExceeded: (exceeded: boolean, limit?: number) => {
            set(
                (state) => ({
                    interactivity: {
                        ...state.interactivity,
                        selectionLimitExceeded: exceeded,
                        selectionLimit: limit
                    }
                }),
                false,
                'interactivity.setSelectionLimitExceeded'
            );
        }
    });
};
