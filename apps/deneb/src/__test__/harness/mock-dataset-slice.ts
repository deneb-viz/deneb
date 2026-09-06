/**
 * Recording stand-in for the visual store's `dataset` slice. The
 * update-cycle driver mirrors `Deneb.resolveDataset`'s dispatch against
 * this slice instead of the real Zustand store, per the U4 harness
 * shape (mocked state slices + fake host + real decision function +
 * real coordinator).
 *
 * Semantics mirrored from `src/state/dataset.ts`'s slice contract as
 * consumed by `src/index.ts`:
 *  - `setIsFetchingAdditional` updates BOTH the flag and `rowsLoaded`
 *    (this is how the recover-interrupted-fetch branch preserves the
 *    displayed row count via `Math.max` without touching `values`).
 *  - `setDataset` replaces `values` and `rowsLoaded` together.
 */

export type MockDatasetState = {
    isFetchingAdditional: boolean;
    rowsLoaded: number;
    values: unknown[];
};

export type SetIsFetchingAdditionalPayload = {
    isFetchingAdditional: boolean;
    rowsLoaded: number;
};

export type SetDatasetPayload = {
    values: unknown[];
    rowsLoaded: number;
};

export type MockDatasetSlice = {
    state: MockDatasetState;
    setIsFetchingAdditional: (payload: SetIsFetchingAdditionalPayload) => void;
    setDataset: (payload: SetDatasetPayload) => void;
    /** Ordered record of every `setIsFetchingAdditional` call. */
    setIsFetchingAdditionalCalls: SetIsFetchingAdditionalPayload[];
    /** Ordered record of every `setDataset` call. */
    setDatasetCalls: SetDatasetPayload[];
};

export const createMockDatasetSlice = (
    initial: Partial<MockDatasetState> = {}
): MockDatasetSlice => {
    const state: MockDatasetState = {
        isFetchingAdditional: initial.isFetchingAdditional ?? false,
        rowsLoaded: initial.rowsLoaded ?? 0,
        values: initial.values ?? []
    };
    const setIsFetchingAdditionalCalls: SetIsFetchingAdditionalPayload[] = [];
    const setDatasetCalls: SetDatasetPayload[] = [];

    return {
        state,
        setIsFetchingAdditional: (payload) => {
            setIsFetchingAdditionalCalls.push(payload);
            state.isFetchingAdditional = payload.isFetchingAdditional;
            state.rowsLoaded = payload.rowsLoaded;
        },
        setDataset: (payload) => {
            setDatasetCalls.push(payload);
            state.values = payload.values;
            state.rowsLoaded = payload.rowsLoaded;
        },
        setIsFetchingAdditionalCalls,
        setDatasetCalls
    };
};
