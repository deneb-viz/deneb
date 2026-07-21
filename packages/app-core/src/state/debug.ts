import { type StateCreator } from 'zustand';
import { type StoreState } from './state';

/**
 * Per-tab sort descriptor. `null` indicates no active sort for that tab.
 */
export type DataPivotSortEntry = {
    colId: string;
    asc: boolean;
} | null;

/**
 * Keyed record of per-tab sort state. The sort for each inner tab is
 * independent — writers must merge into this record preserving the sibling
 * tab's value (per type-widening call-site audit learning).
 */
export type DataPivotSort = {
    source: DataPivotSortEntry;
    data: DataPivotSortEntry;
};

/**
 * Keyed record of per-tab page number (1-based, as surfaced by
 * `react-data-table-component`). Writers must merge preserving the sibling
 * tab's value.
 */
export type DataPivotPage = {
    source: number;
    data: number;
};

export type DebugSliceProperties = {
    /**
     * The currently specified dataset for the data viewer.
     */
    datasetName: string;
    /**
     * Per-tab sort state for the Source and Data inner tabs. Each tab's
     * sort is independent; clearing one tab's sort does not affect the
     * other.
     */
    dataPivotSort: DataPivotSort;
    /**
     * Per-tab page number for the Source and Data inner tabs.
     */
    dataPivotPage: DataPivotPage;
    /**
     * Set the current dataset for the data viewer.
     */
    setDatasetName: (datasetName: string) => void;
    /**
     * Set the Data tab's sort descriptor (or `null` to clear). Does not
     * affect the Source tab's sort.
     */
    setDataTabSort: (sort: DataPivotSortEntry) => void;
    /**
     * Set the Source tab's sort descriptor (or `null` to clear). Does not
     * affect the Data tab's sort.
     */
    setSourceTabSort: (sort: DataPivotSortEntry) => void;
    /**
     * Set the Data tab's current page number. Does not affect the Source
     * tab's page.
     */
    setDataTabPage: (page: number) => void;
    /**
     * Set the Source tab's current page number. Does not affect the Data
     * tab's page.
     */
    setSourceTabPage: (page: number) => void;
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
            dataPivotSort: {
                source: null,
                data: null
            },
            dataPivotPage: {
                source: 1,
                data: 1
            },
            setDatasetName: (datasetName: string) =>
                set(
                    (state) => handleSetDatasetName(state, datasetName),
                    false,
                    'debug.setDatasetName'
                ),
            setDataTabSort: (sort: DataPivotSortEntry) =>
                set(
                    (state) => handleSetDataTabSort(state, sort),
                    false,
                    'debug.setDataTabSort'
                ),
            setSourceTabSort: (sort: DataPivotSortEntry) =>
                set(
                    (state) => handleSetSourceTabSort(state, sort),
                    false,
                    'debug.setSourceTabSort'
                ),
            setDataTabPage: (page: number) =>
                set(
                    (state) => handleSetDataTabPage(state, page),
                    false,
                    'debug.setDataTabPage'
                ),
            setSourceTabPage: (page: number) =>
                set(
                    (state) => handleSetSourceTabPage(state, page),
                    false,
                    'debug.setSourceTabPage'
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

/**
 * Sets the Data tab's sort descriptor while preserving the Source tab's
 * sort (type-widening call-site audit: merge into the keyed record).
 */
const handleSetDataTabSort = (
    state: StoreState,
    sort: DataPivotSortEntry
): Partial<StoreState> => ({
    debug: {
        ...state.debug,
        dataPivotSort: { ...state.debug.dataPivotSort, data: sort }
    }
});

/**
 * Sets the Source tab's sort descriptor while preserving the Data tab's
 * sort.
 */
const handleSetSourceTabSort = (
    state: StoreState,
    sort: DataPivotSortEntry
): Partial<StoreState> => ({
    debug: {
        ...state.debug,
        dataPivotSort: { ...state.debug.dataPivotSort, source: sort }
    }
});

/**
 * Sets the Data tab's current page while preserving the Source tab's page.
 */
const handleSetDataTabPage = (
    state: StoreState,
    page: number
): Partial<StoreState> => ({
    debug: {
        ...state.debug,
        dataPivotPage: { ...state.debug.dataPivotPage, data: page }
    }
});

/**
 * Sets the Source tab's current page while preserving the Data tab's page.
 */
const handleSetSourceTabPage = (
    state: StoreState,
    page: number
): Partial<StoreState> => ({
    debug: {
        ...state.debug,
        dataPivotPage: { ...state.debug.dataPivotPage, source: page }
    }
});
