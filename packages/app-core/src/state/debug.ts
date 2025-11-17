import { type StateCreator } from 'zustand';
import { type StoreState } from './state';

export type DebugSliceProperties = {
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

export type DebugSlice = {
    debug: DebugSliceProperties;
};

export const createDebugSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        DebugSlice
    > =>
    (set) => ({
        debug: {
            datasetName: '',
            logAttention: false,
            setDatasetName: (datasetName: string) =>
                set(
                    (state) => handleSetDatasetName(state, datasetName),
                    false,
                    'debug.setDatasetName'
                )
        }
    });

/**
 * Sets the debug dataset for the data viewer.
 */
const handleSetDatasetName = (
    state: StoreState,
    datasetName: string
): Partial<StoreState> => ({
    debug: { ...state.debug, datasetName }
});
