import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import { TStoreState } from '.';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/dataset/data';
import { type DebugSlice } from '@deneb-viz/app-core';

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
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
    TStoreState,
    [['zustand/devtools', never]],
    [],
    DebugSlice
> = sliceStateInitializer;

/**
 * Sets the debug dataset for the data viewer.
 */
const handleSetDatasetName = (
    state: TStoreState,
    datasetName: string
): Partial<TStoreState> => ({
    debug: { ...state.debug, datasetName }
});
