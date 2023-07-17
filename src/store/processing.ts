import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import { TStoreState } from '.';

export interface IProcessingSlice {
    processing: {
        shouldProcessDataset: boolean;
    };
}

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
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
