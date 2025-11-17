import { type StateCreator } from 'zustand';

import { type StoreState } from './state';

export type ProcessingSliceProperties = {
    shouldProcessDataset: boolean;
};

export type ProcessingSlice = {
    processing: ProcessingSliceProperties;
};

export const createProcessingSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        ProcessingSlice
    > =>
    () => ({
        processing: {
            shouldProcessDataset: false
        }
    });
