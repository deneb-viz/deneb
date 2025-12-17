import type { StateCreator } from 'zustand';

import { type DenebVisualStoreState } from './state';
import { getDisplayModeAccordingToOptions } from '../lib/state';
import {
    type DatasetValueRow,
    type IDatasetFields
} from '@deneb-viz/powerbi-compat/dataset';
import { type SelectorStatus } from '@deneb-viz/powerbi-compat/interactivity';
import { getUpdatedDatasetSelectors } from '../lib/dataset/processing';

export type DatasetSlice = {
    fields: IDatasetFields;
    hasDrilldown: boolean;
    hasHighlights: boolean;
    isFetchingAdditional: boolean;
    shouldProcess: boolean;
    rowsLoaded: number;
    values: DatasetValueRow[];
    version: number;
    setDataset: (payload: SetDatasetPayload) => void;
    setIsFetchingAdditional: (payload: SetIsFetchingAdditionalPayload) => void;
    setSelectors: (selectorMap: SelectorStatus) => Promise<void>;
};

export type SetDatasetPayload = {
    fields: IDatasetFields;
    hasDrilldown: boolean;
    hasHighlights: boolean;
    rowsLoaded: number;
    values: DatasetValueRow[];
};

type SetIsFetchingAdditionalPayload = {
    isFetchingAdditional: boolean;
    rowsLoaded: number;
};

export const createDatasetSlice = (): StateCreator<
    DenebVisualStoreState,
    [['zustand/devtools', never]],
    [],
    DatasetSlice
> => {
    return (set, get) => ({
        fields: {},
        hasDrilldown: false,
        hasHighlights: false,
        isFetchingAdditional: false,
        rowsLoaded: 0,
        shouldProcess: false,
        values: [],
        version: 0,
        setDataset: (payload: SetDatasetPayload) => {
            set(
                (state) => ({
                    dataset: {
                        ...state.dataset,
                        ...payload,
                        shouldProcess: false,
                        version: state.dataset.version + 1
                    }
                }),
                false,
                'dataset.setDataset'
            );
        },
        setIsFetchingAdditional: (payload: SetIsFetchingAdditionalPayload) => {
            const { isFetchingAdditional, rowsLoaded } = payload;
            const { mode } = get().interface;
            const { isFetchingAdditional: currentIsFetchingAdditional } =
                get().dataset;
            const newMode =
                currentIsFetchingAdditional &&
                !isFetchingAdditional &&
                mode === 'fetching'
                    ? getDisplayModeAccordingToOptions({
                          isFetchingAdditionalData: isFetchingAdditional,
                          options: get().updates.options,
                          settings: get().settings
                      })
                    : mode;
            if (newMode !== mode) {
                get().interface.setMode(newMode);
            }
            set(
                (state) => ({
                    dataset: {
                        ...state.dataset,
                        isFetchingAdditional,
                        rowsLoaded
                    }
                }),
                false,
                'dataset.setIsFetchingAdditional'
            );
        },
        setSelectors: async (selectorMap: SelectorStatus) => {
            set(
                (state) => ({
                    dataset: {
                        ...state.dataset,
                        ...getUpdatedDatasetSelectors(
                            state.dataset,
                            selectorMap,
                            state.settings.vega.interactivity.enableSelection
                                .value
                        ),
                        version: state.dataset.version + 1
                    }
                }),
                false,
                'dataset.setSelectors'
            );
        }
    });
};
