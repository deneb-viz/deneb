import { StateCreator } from 'zustand';

import { type StoreState, type ProcessingSlice } from '@deneb-viz/app-core';

const sliceStateInitializer = () =>
    <ProcessingSlice>{
        processing: {
            shouldProcessDataset: false
        }
    };

export const createProcessingSlice: StateCreator<
    StoreState,
    [['zustand/devtools', never]],
    [],
    ProcessingSlice
> = sliceStateInitializer;
