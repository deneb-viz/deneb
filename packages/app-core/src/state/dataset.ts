import { type StateCreator } from 'zustand';

import { type StoreState } from './state';
import { getParsedSpec } from '@deneb-viz/json-processing/spec-processing';
import { getSpecificationParseOptions } from './helpers';
import { getDatasetTemplateFieldsFromMetadata } from '@deneb-viz/powerbi-compat/dataset';
import { logDebug, logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import {
    areAllCreateDataRequirementsMet,
    getUpdatedExportMetadata
} from '@deneb-viz/json-processing';
import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { type TabularDataset } from '../lib/dataset';

export type DatasetSlice = {
    dataset: TabularDataset;
    updateDataset: (payload: VisualDatasetUpdatePayload) => void;
};

export type VisualDatasetUpdatePayload = {
    dataset: TabularDataset;
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

// eslint-disable-next-line max-lines-per-function
const handleUpdateDataset = (
    state: StoreState,
    payload: VisualDatasetUpdatePayload
): Partial<StoreState> => {
    logDebug('dataset.updateDataset', payload);
    const { dataset } = payload;
    const {
        metadataAllDependenciesAssigned = false,
        metadataAllFieldsAssigned = false
    } = areAllCreateDataRequirementsMet(state.create.metadata);
    const specOptions = getSpecificationParseOptions(state);
    const spec = getParsedSpec(state.specification, specOptions, {
        ...specOptions
    });
    logTimeStart('dataset.updateDataset.getUpdatedExportMetadata');
    const exportMetadata = getUpdatedExportMetadata(
        state.export.metadata as UsermetaTemplate,
        {
            dataset: getDatasetTemplateFieldsFromMetadata(
                payload.dataset.fields
            ).map((d) => {
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
            })
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
        debug: { ...state.debug, logAttention: spec.errors.length > 0 },
        export: {
            ...state.export,
            metadata: exportMetadata
        },
        specification: {
            ...state.specification,
            ...spec
        }
    };
};
