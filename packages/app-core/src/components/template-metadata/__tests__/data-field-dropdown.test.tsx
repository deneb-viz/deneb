import { describe, expect, it } from 'vitest';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import type { UsermetaDatasetField } from '@deneb-viz/data-core/field';

import { createDenebState } from '../../../state/state';
import { installEditorState } from '../../../state/install-editor-state';

/**
 * `DataFieldDropdown` (`../data-field-dropdown.tsx`) takes a required
 * `setFieldAssignment` prop, injected by the caller (`template-information.tsx`
 * passes `state.create.setFieldAssignment` for the create path;
 * `export-pane.tsx` passes `state.fieldUsage.setFieldAssignment` for the
 * export/mapping path) — the component just calls whichever reducer it was
 * given, with no `fieldUsage` reference of its own.
 *
 * Component-tree rendering tests are deferred in this workspace (vitest
 * runs in the `node` environment with no `@testing-library/react` — see
 * `no-data-message.test.tsx`). This file instead exercises the two
 * injectable reducers directly, with the exact payload shape the
 * component's effect constructs (`{ key, suppliedObjectKey,
 * suppliedObjectName }`): each reducer only touches its own slice, so
 * `DataFieldDropdown` calling whichever one it was given is safe regardless
 * of which caller wired it up.
 */

const makeStore = () => {
    const store = createDenebState();
    installEditorState(store, { applicationVersion: 'test' });
    return store;
};

const FIELD: UsermetaDatasetField = {
    key: '__dataset.0__',
    name: 'Category',
    namePlaceholder: 'Category',
    type: 'text'
};

const assignmentPayload = {
    key: FIELD.key,
    suppliedObjectKey: 'qn-cat',
    suppliedObjectName: 'Category'
};

describe('template dataset field-assignment reducer injection', () => {
    it('state.create.setFieldAssignment (the create-path reducer) updates create.metadata and leaves fieldUsage untouched', () => {
        const store = makeStore();
        store.setState((state) => ({
            create: {
                ...state.create,
                metadata: {
                    ...state.create.metadata,
                    datasets: { [DATASET_DEFAULT_NAME]: [FIELD] }
                } as never
            }
        }));
        const fieldUsageBefore = store.getState().fieldUsage;

        store.getState().create.setFieldAssignment(assignmentPayload);

        const { create, fieldUsage } = store.getState();
        expect(
            create.metadata?.datasets?.[DATASET_DEFAULT_NAME]?.[0]
        ).toMatchObject({
            suppliedObjectKey: 'qn-cat',
            suppliedObjectName: 'Category'
        });
        // Same slice reference — the create reducer never wrote fieldUsage.
        expect(fieldUsage).toBe(fieldUsageBefore);
    });

    it('state.fieldUsage.setFieldAssignment (the export/mapping-path reducer) updates fieldUsage.remapFields and leaves create.metadata untouched', () => {
        const store = makeStore();
        store.setState((state) => ({
            fieldUsage: {
                ...state.fieldUsage,
                remapFields: [FIELD]
            }
        }));
        const createBefore = store.getState().create;

        store.getState().fieldUsage.setFieldAssignment(assignmentPayload);

        const { create, fieldUsage } = store.getState();
        expect(fieldUsage.remapFields[0]).toMatchObject({
            suppliedObjectKey: 'qn-cat',
            suppliedObjectName: 'Category'
        });
        // Same slice reference — the field-usage reducer never wrote create.
        expect(create).toBe(createBefore);
    });
});
