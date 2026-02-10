import { type StateCreator } from 'zustand';

import { type StoreState } from './state';
import {
    getDatasetTemplateFieldsFromMetadata,
    normalizeFieldsInput
} from '@deneb-viz/data-core/field';
import { logDebug, logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import {
    areAllCreateDataRequirementsMet,
    getUpdatedExportMetadata
} from '@deneb-viz/json-processing';
import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
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
        StoreState,
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
 * Handle dataset updates from host application, and update export metadata.
 * Normalizes field input (array or record) to the internal record format.
 */
const handleUpdateDataset = (
    state: StoreState,
    payload: VisualDatasetUpdatePayload
): Partial<StoreState> => {
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

    logTimeStart('dataset.updateDataset.getUpdatedExportMetadata');
    const exportMetadata = getUpdatedExportMetadata(
        state.export.metadata as UsermetaTemplate,
        {
            dataset: getDatasetTemplateFieldsFromMetadata(normalizedFields).map(
                (d) => {
                    const match = state.export.metadata?.dataset.find(
                        (ds) => ds.key === d.key
                    );
                    if (match) {
                        return {
                            ...match,
                            ...{
                                name: d.name,
                                namePlaceholder: d.namePlaceholder
                            }
                        };
                    }
                    return d;
                }
            )
        }
    );
    logTimeEnd('dataset.updateDataset.getUpdatedExportMetadata');
    logDebug('dataset.updateDataset persisting to store...');

    return {
        create: {
            ...state.create,
            metadataAllDependenciesAssigned,
            metadataAllFieldsAssigned
        },
        dataset,
        export: {
            ...state.export,
            metadata: exportMetadata
        }
    };
};
