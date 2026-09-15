import { type StateCreator } from 'zustand';

import { type CoreStoreState } from './state';
import { normalizeFieldsInput } from '@deneb-viz/data-core/field';
import { logDebug } from '@deneb-viz/utils/logging';
import { areAllCreateDataRequirementsMet } from '@deneb-viz/json-processing';
import {
    type TabularDataset,
    type TabularDatasetInput
} from '@deneb-viz/data-core/dataset';

export type DatasetSlice = {
    dataset: TabularDataset;
    updateDataset: (payload: VisualDatasetUpdatePayload) => void;
};

export type VisualDatasetUpdatePayload = {
    dataset: TabularDatasetInput;
};

export const createDatasetSlice =
    (): StateCreator<
        CoreStoreState,
        [['zustand/devtools', never]],
        [],
        DatasetSlice
    > =>
    (set) => ({
        dataset: {
            fields: {},
            values: []
        },
        updateDataset: (payload) =>
            set(
                (state) => handleUpdateDataset(state, payload),
                false,
                'updateDataset'
            )
    });

/**
 * Handle dataset updates from host application. Export metadata is
 * recomputed by the editor-side subscription registered in
 * `installEditorState`, which reacts to `dataset` changing (see
 * `state/export.ts`). Normalizes field input (array or record) to the
 * internal record format.
 */
const handleUpdateDataset = (
    state: CoreStoreState,
    payload: VisualDatasetUpdatePayload
): Partial<CoreStoreState> => {
    logDebug('dataset.updateDataset', payload);

    // Normalize fields input (array → record)
    const normalizedFields = normalizeFieldsInput(payload.dataset.fields);
    const dataset: TabularDataset = {
        fields: normalizedFields,
        values: payload.dataset.values
    };

    const {
        metadataAllDependenciesAssigned = false,
        metadataAllFieldsAssigned = false
    } = areAllCreateDataRequirementsMet(state.create.metadata);

    logDebug('dataset.updateDataset persisting to store...');

    return {
        create: {
            ...state.create,
            metadataAllDependenciesAssigned,
            metadataAllFieldsAssigned
        },
        dataset
    };
};
