import { StateCreator } from 'zustand';

import { TStoreState } from '.';

export interface IProcessingSlice {
    processing: {
        shouldProcessDataset: boolean;
    };
}

const sliceStateInitializer = () =>
    <IProcessingSlice>{
        processing: {
            shouldProcessDataset: false
        }
    };

export const createProcessingSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    IProcessingSlice
> = sliceStateInitializer;
