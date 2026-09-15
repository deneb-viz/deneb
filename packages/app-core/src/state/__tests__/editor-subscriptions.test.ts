import { describe, expect, it, vi } from 'vitest';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import type { UsermetaDatasetField } from '@deneb-viz/data-core/field';
import { createDenebState } from '../state';
import {
    installEditorState,
    isEditorStateInstalled
} from '../install-editor-state';
import type { ProjectSyncPayload } from '../project';

/**
 * U5 (docs/plans/2026-09-15-001-refactor-editor-package-extraction-plan.md)
 * — the editor-side subscriptions registered by `installEditorState` that
 * replace the cross-slice writes removed from `state/project.ts` and
 * `state/dataset.ts`:
 *
 *  1. Staged-text refresh, keyed on `project.contentCommitCount`
 *     (`initializeFromTemplate` and `setContent`).
 *  2. Create signal (select the Spec pane + request focus), keyed on
 *     `project.initializationCount` (`initializeFromTemplate` only).
 *  3. Export-metadata recompute, keyed on `project`/`dataset` reference
 *     changes (every project write and `updateDataset`).
 *
 * The characterization tests in `cross-slice-writes.characterization.test.ts`
 * (U2) pin the exact resulting VALUES for these same flows; this file pins
 * the SUBSCRIPTION MECHANISM itself — installation, idempotency, ordering,
 * and the core/editor decoupling (AE3).
 */

const makeStore = () => {
    const store = createDenebState({ applicationVersion: 'test' });
    installEditorState(store, { applicationVersion: 'test' });
    return store;
};

const partialSync = (payload: Record<string, unknown>) =>
    payload as unknown as ProjectSyncPayload;

describe('editor subscriptions — initializeFromTemplate', () => {
    it('(i) seeds export metadata, stages both roles, and selects the Spec pane, matching the pre-subscription behaviour', () => {
        const store = makeStore();
        store.getState().updateEditorSelectedOperation('Config');

        store.getState().project.initializeFromTemplate({
            spec: '{"mark":"point"}',
            config: '{}',
            provider: 'vegaLite',
            supportFieldConfiguration: {
                Category: { highlight: true, format: false, formatted: true }
            }
        });

        const state = store.getState();
        expect(state.editor.stagedSpec).toBe('{"mark":"point"}');
        // Regression coverage for the value-collision bug this test caught
        // during implementation: '{}' happens to equal PROJECT_DEFAULTS.config,
        // so a naive value-diff subscription would wrongly skip staging it.
        expect(state.editor.stagedConfig).toBe('{}');
        expect(state.editorSelectedOperation).toBe('Spec');
        expect(state.export.metadata?.config).toBe('{}');
        expect(state.export.metadata?.deneb.provider).toBe('vegaLite');
    });
});

describe('editor subscriptions — setContent', () => {
    it('(ii) refreshes staged text for both roles but does NOT change the selected pane', () => {
        const store = makeStore();
        store.getState().updateEditorSelectedOperation('Config');

        store.getState().project.setContent({
            spec: '{"mark":"bar"}',
            config: '{"padding":5}'
        });

        const state = store.getState();
        expect(state.editor.stagedSpec).toBe('{"mark":"bar"}');
        expect(state.editor.stagedConfig).toBe('{"padding":5}');
        // The create-signal subscription must not have fired.
        expect(state.editorSelectedOperation).toBe('Config');
    });
});

describe('editor subscriptions — syncProjectData (host sync)', () => {
    it('(iii) does not change the selected pane even when spec/config content changes', () => {
        const store = makeStore();
        store.getState().updateEditorSelectedOperation('Config');

        store.getState().project.syncProjectData(
            partialSync({
                spec: '{"mark":"area"}',
                config: '{"padding":10}'
            })
        );

        const state = store.getState();
        expect(state.project.spec).toBe('{"mark":"area"}');
        expect(state.editorSelectedOperation).toBe('Config');
    });
});

describe('editor subscriptions — updateDataset', () => {
    it('(iv) recomputes export metadata on a dataset change; a subsequent unrelated action leaves it untouched', () => {
        const store = makeStore();

        store.getState().updateDataset({
            dataset: { fields: ['Category'], values: [] }
        });
        const metadataAfterDatasetUpdate = store.getState().export.metadata;
        expect(
            metadataAfterDatasetUpdate?.datasets?.[DATASET_DEFAULT_NAME]
        ).toEqual([
            {
                key: '__dataset.0__',
                name: 'Category',
                namePlaceholder: 'Category',
                description: '',
                kind: 'column',
                type: 'other'
            }
        ] satisfies UsermetaDatasetField[]);

        // An action that touches neither `project` nor `dataset` must not
        // trigger the export-metadata subscription at all — the object
        // reference is preserved, not just structurally re-equal.
        store.getState().editor.toggleCompiledVegaPane();

        expect(store.getState().export.metadata).toBe(
            metadataAfterDatasetUpdate
        );
    });
});

describe('editor subscriptions — synchronous ordering', () => {
    it('(v) a subscriber sees staged text and dirty state already updated within the same outer set() call', () => {
        const store = makeStore();
        let observedStagedSpec: string | undefined;
        let observedIsDirty: boolean | undefined;
        const unsubscribe = store.subscribe((state, prev) => {
            if (state.project !== prev.project) {
                observedStagedSpec = state.editor.stagedSpec;
                observedIsDirty = state.editor.isDirty;
            }
        });

        store.getState().project.setContent({
            spec: '{"mark":"line"}',
            config: '{}'
        });

        expect(observedStagedSpec).toBe('{"mark":"line"}');
        // project.spec has already been updated to the incoming text by
        // the time the staged-text subscription's updateChanges call
        // reads it (same documented quirk as the U2 characterization
        // tests), so isDirty comes out false — the point of this
        // assertion is that a value was observed AT ALL (not `undefined`,
        // proving the subscriber ran synchronously before this line),
        // not which value it settled on.
        expect(observedIsDirty).toBe(false);
        unsubscribe();
    });
});

describe('editor subscriptions — core/editor decoupling (AE3)', () => {
    it('(vi) a core-only store (no install) runs every rewritten action without throwing and without exposing any editor/export key', () => {
        const store = createDenebState({ applicationVersion: 'test' });
        expect(isEditorStateInstalled(store.getState())).toBe(false);

        expect(() => {
            store.getState().updateDataset({
                dataset: { fields: ['Category'], values: [] }
            });
            store.getState().project.initializeFromTemplate({
                spec: '{"mark":"bar"}',
                config: '{}',
                provider: 'vegaLite'
            });
            store.getState().project.setContent({
                spec: '{"mark":"line"}',
                config: '{}'
            });
            store.getState().project.setSupportFieldConfiguration({
                Category: { highlight: true, format: false, formatted: true }
            });
        }).not.toThrow();

        const state = store.getState();
        for (const key of [
            'editor',
            'export',
            'commands',
            'fieldUsage',
            'debug',
            'settingsPane'
        ]) {
            expect(state).not.toHaveProperty(key);
        }
    });
});

describe('editor subscriptions — install idempotency', () => {
    it('(vii) installing twice does not double-fire a subscription for one project change', () => {
        const store = createDenebState({ applicationVersion: 'test' });
        installEditorState(store, { applicationVersion: 'test' });
        installEditorState(store, { applicationVersion: 'test' });

        const updateChangesSpy = vi.spyOn(
            store.getState().editor,
            'updateChanges'
        );

        store.getState().project.setContent({
            spec: '{"mark":"bar"}',
            config: '{}'
        });

        // Exactly one call per role (Spec, Config) — a double-registered
        // subscription would call this four times for one setContent.
        expect(updateChangesSpy).toHaveBeenCalledTimes(2);
    });
});
