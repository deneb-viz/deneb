import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import { DATASET_DEFAULT_NAME } from '@deneb-viz/dataset/data';
import { type StoreState, type DebugSlice } from '@deneb-viz/app-core';

const sliceStateInitializer = (set: NamedSet<StoreState>) =>
    <DebugSlice>{
        debug: {
            datasetName: DATASET_DEFAULT_NAME,
            logAttention: false,
            setDatasetName: (datasetName) =>
                set(
                    (state) => handleSetDatasetName(state, datasetName),
                    false,
                    'debug.setDatasetName'
                )
        }
    };

export const createDebugSlice: StateCreator<
    StoreState,
    [['zustand/devtools', never]],
    [],
    DebugSlice
> = sliceStateInitializer;

/**
 * Sets the debug dataset for the data viewer.
 */
const handleSetDatasetName = (
    state: StoreState,
    datasetName: string
): Partial<StoreState> => ({
    debug: { ...state.debug, datasetName }
});
