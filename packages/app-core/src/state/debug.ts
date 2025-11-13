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
