import { StateCreator } from 'zustand';

import { TStoreState } from '.';
import { type ProcessingSlice } from '@deneb-viz/app-core';

const sliceStateInitializer = () =>
    <ProcessingSlice>{
        processing: {
            shouldProcessDataset: false
        }
    };

export const createProcessingSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    ProcessingSlice
> = sliceStateInitializer;
