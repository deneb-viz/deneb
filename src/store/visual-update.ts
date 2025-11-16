import { StateCreator } from 'zustand';

import { TStoreState } from '.';
import { type VisualUpdateSlice } from '@deneb-viz/app-core';

const sliceStateInitializer = () =>
    <VisualUpdateSlice>{
        visualUpdateOptions: {
            history: [],
            updateId: null
        }
    };

export const createVisualUpdateSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    VisualUpdateSlice
> = sliceStateInitializer;
