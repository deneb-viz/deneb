import { StateCreator } from 'zustand';

import { type StoreState, type VisualUpdateSlice } from '@deneb-viz/app-core';

const sliceStateInitializer = () =>
    <VisualUpdateSlice>{
        visualUpdateOptions: {
            history: [],
            updateId: null
        }
    };

export const createVisualUpdateSlice: StateCreator<
    StoreState,
    [['zustand/devtools', never]],
    [],
    VisualUpdateSlice
> = sliceStateInitializer;
