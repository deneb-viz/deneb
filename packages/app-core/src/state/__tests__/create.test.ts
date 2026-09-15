import { describe, expect, it } from 'vitest';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import type { UsermetaDatasetField } from '@deneb-viz/data-core/field';

import { createDenebState } from '../state';

/**
 * The create slice's field-assignment reducer, exercised on a core-only
 * store (no editor slices installed): it is the reducer the template
 * import path injects into the dataset table, so it must work with
 * nothing but the core slices present.
 */
const FIELD: UsermetaDatasetField = {
    key: '__dataset.0__',
    name: 'Category',
    namePlaceholder: 'Category',
    type: 'text'
};

const seedTemplateDataset = () => {
    const store = createDenebState();
    store.setState((state) => ({
        create: {
            ...state.create,
            metadata: {
                ...state.create.metadata,
                datasets: { [DATASET_DEFAULT_NAME]: [FIELD] }
            } as never
        }
    }));
    return store;
};

describe('create slice — setFieldAssignment', () => {
    it('records the supplied field on the matching template dataset entry', () => {
        const store = seedTemplateDataset();

        store.getState().create.setFieldAssignment({
            key: FIELD.key,
            suppliedObjectKey: 'qn-cat',
            suppliedObjectName: 'Category'
        });

        expect(
            store.getState().create.metadata?.datasets?.[
                DATASET_DEFAULT_NAME
            ]?.[0]
        ).toMatchObject({
            suppliedObjectKey: 'qn-cat',
            suppliedObjectName: 'Category'
        });
    });

    it('writes only the create slice', () => {
        const store = seedTemplateDataset();
        const { project, dataset, interface: ui } = store.getState();

        store.getState().create.setFieldAssignment({
            key: FIELD.key,
            suppliedObjectKey: 'qn-cat',
            suppliedObjectName: 'Category'
        });

        const after = store.getState();
        expect(after.project).toBe(project);
        expect(after.dataset).toBe(dataset);
        expect(after.interface).toBe(ui);
        expect('editor' in after).toBe(false);
    });
});
