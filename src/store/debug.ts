import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import { TStoreState } from '.';
import { DEBUG_DEFAULT_DATASET_NAME } from '../constants';

export interface IDebugSlice {
    debug: {
        /**
         * The currently specified dataset for the data viewer.
         */
        datasetName: string;
        /**
         * Whether the log pane should be in an attention state (due to errors).
         */
        logAttention: boolean;
        /**
         * Set the current dataset for the data viewer.
         */
        setDatasetName: (datasetName: string) => void;
    };
}

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <IDebugSlice>{
        debug: {
            datasetName: DEBUG_DEFAULT_DATASET_NAME,
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
    IDebugSlice
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
