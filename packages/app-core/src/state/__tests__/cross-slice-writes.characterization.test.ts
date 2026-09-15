import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompilationResult } from '@deneb-viz/vega-runtime/compilation';
import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import type { UsermetaDatasetField } from '@deneb-viz/data-core/field';

/**
 * U2 (docs/plans/2026-09-15-001-refactor-editor-package-extraction-plan.md) —
 * characterization tests for the four cross-slice writes that U4/U5 replace
 * with editor-side derived selectors and subscriptions:
 *
 *  1. compilation.compile (handleCompile) -> commands (export + zoom flags)
 *  2. fieldUsage.applyTrackingChanges (handleApplyTrackingChanges) -> commands.exportSpecification
 *  3. dataset.updateDataset (handleUpdateDataset) -> create (assignment flags) + export.metadata
 *  4. project.initializeFromTemplate / setContent / setSupportFieldConfiguration /
 *     applySupportFieldMigrationStamp -> export.metadata + editor staged text/dirty +
 *     editorSelectedOperation + interface.modalDialogRole
 *
 * U4 removed writes 1 and 2 (`handleCompile` and `handleApplyTrackingChanges`
 * no longer write `commands` at all): flows 1 and 2 below are re-pointed to
 * assert the same enablement via `selectExportSpecificationCommandEnabled` /
 * `selectZoomCommandsState` instead of `state.commands.*`, and flow 1 adds an
 * explicit assertion that `compile()` leaves the `commands` slice object
 * reference-identical. Flows 3 and 4 are untouched — those writes are U5's
 * concern, not U4's, and still land exactly as characterized here.
 *
 * These tests pin exact values (not just truthiness), so a green run is
 * proof of equivalence with pre-refactor behaviour. Do not "fix" a
 * surprising value here — if it looks odd, it is pinning real current
 * behaviour (see inline notes, e.g. the isDirty=false outcome on template
 * init/setContent).
 *
 * Driving `compile()`: the smallest public action that reaches `handleCompile`
 * is `store.getState().compilation.compile(options)` on the real, fully-wired
 * store from `createDenebState`. This mirrors the existing pattern in
 * `commands-recovery.test.ts`, which also drives `handleCompile` through this
 * action with `compileSpec` mocked (full Vega compilation is out of scope for
 * a unit test and isn't needed — only the post-compile state merge matters
 * here).
 */

const READY_RESULT: CompilationResult = {
    status: 'ready',
    parsed: {} as never,
    embedOptions: {}
};

vi.mock('@deneb-viz/vega-runtime/compilation', async () => {
    const actual = await vi.importActual<
        typeof import('@deneb-viz/vega-runtime/compilation')
    >('@deneb-viz/vega-runtime/compilation');
    return {
        ...actual,
        compileSpec: vi.fn(() => READY_RESULT)
    };
});

import { compileSpec } from '@deneb-viz/vega-runtime/compilation';
import { createDenebState } from '../state';
import { installEditorState } from '../install-editor-state';
import {
    selectExportSpecificationCommandEnabled,
    selectZoomCommandsState
} from '../../lib/commands/selectors';

const ZOOM_MIN = VISUAL_PREVIEW_ZOOM_CONFIGURATION.min;
const ZOOM_MAX = VISUAL_PREVIEW_ZOOM_CONFIGURATION.max;
const ZOOM_DEFAULT = VISUAL_PREVIEW_ZOOM_CONFIGURATION.default;

/**
 * Build a fresh, fully-wired Deneb state store per test (same pattern as
 * project.test.ts / commands-recovery.test.ts — the real store factory
 * avoids circular-import problems and exercises cross-slice writes as at
 * runtime). `createDenebState` only assembles core slices now, so
 * `installEditorState` merges the editor-only slices in immediately —
 * these characterization tests exercise editor, export and commands,
 * all editor-only.
 */
const makeStore = () => {
    const store = createDenebState({ applicationVersion: 'test' });
    installEditorState(store, { applicationVersion: 'test' });
    return store;
};

describe('U2 flow 1 — compilation.compile (handleCompile) no longer writes commands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(compileSpec).mockReturnValue(READY_RESULT);
    });

    it('does not touch the commands slice object at all: reference-identical before and after compile', () => {
        const store = makeStore();
        const commandsBefore = store.getState().commands;

        store.getState().compilation.compile({} as never);

        expect(store.getState().commands).toBe(commandsBefore);
    });

    it('derives exportSpecification=false when the editor is dirty at a successful compile', () => {
        const store = makeStore();
        store.getState().editor.updateIsDirty(true);

        store.getState().compilation.compile({} as never);

        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(false);
    });

    it('derives exportSpecification=true when the editor is not dirty at a successful compile', () => {
        const store = makeStore();
        expect(store.getState().editor.isDirty).toBe(false);

        store.getState().compilation.compile({} as never);

        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(true);
    });

    it('derives zoom commands against the current editorZoomLevel at the min boundary after compile', () => {
        const store = makeStore();
        store.getState().updateEditorZoomLevel(ZOOM_MIN);

        store.getState().compilation.compile({} as never);

        const commands = selectZoomCommandsState(store.getState());
        expect(commands.zoomOut).toBe(false); // at min, can't zoom out further
        expect(commands.zoomIn).toBe(true); // not at max, so zoom in is enabled
        expect(commands.zoomFit).toBe(true);
        expect(commands.zoomReset).toBe(true);
    });

    it('derives zoom commands against the current editorZoomLevel at the max boundary after compile', () => {
        const store = makeStore();
        store.getState().updateEditorZoomLevel(ZOOM_MAX);

        store.getState().compilation.compile({} as never);

        const commands = selectZoomCommandsState(store.getState());
        expect(commands.zoomIn).toBe(false); // at max, can't zoom in further
        expect(commands.zoomOut).toBe(true);
        expect(commands.zoomFit).toBe(true);
        expect(commands.zoomReset).toBe(true);
    });

    it('derives all four zoom commands enabled at a mid-range editorZoomLevel after a successful compile', () => {
        const store = makeStore();
        store.getState().updateEditorZoomLevel(ZOOM_DEFAULT);

        store.getState().compilation.compile({} as never);

        expect(selectZoomCommandsState(store.getState())).toEqual({
            zoomIn: true,
            zoomOut: true,
            zoomFit: true,
            zoomReset: true
        });
    });

    it('derives export + zoom commands disabled on an error result', () => {
        const store = makeStore();
        vi.mocked(compileSpec).mockReturnValueOnce({
            status: 'error',
            parsed: {} as never,
            embedOptions: {},
            errors: ['boom']
        } as CompilationResult);

        store.getState().compilation.compile({} as never);

        const state = store.getState();
        expect(selectExportSpecificationCommandEnabled(state)).toEqual({
            exportSpecification: false
        });
        expect(selectZoomCommandsState(state)).toEqual({
            zoomIn: false,
            zoomOut: false,
            zoomFit: false,
            zoomReset: false
        });
    });
});

describe('U2 flow 2 — fieldUsage.applyTrackingChanges (handleApplyTrackingChanges) no longer writes commands.exportSpecification', () => {
    const TRACKING_PAYLOAD = {
        trackedFields: {},
        trackedDrilldown: { isCurrent: false, isMappingRequired: false },
        remapFields: [] as UsermetaDatasetField[]
    };

    it('does not touch the commands slice object: exportSpecification derives to true when the editor is clean and the compilation result is ready', () => {
        const store = makeStore();
        store.setState((state) => ({
            compilation: { ...state.compilation, result: READY_RESULT }
        }));
        expect(store.getState().editor.isDirty).toBe(false);
        const commandsBefore = store.getState().commands;

        store.getState().fieldUsage.applyTrackingChanges(TRACKING_PAYLOAD);

        expect(store.getState().commands).toBe(commandsBefore);
        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(true);
    });

    it('exportSpecification derives to false when the editor is dirty even though the compilation result is ready', () => {
        const store = makeStore();
        store.setState((state) => ({
            compilation: { ...state.compilation, result: READY_RESULT },
            editor: { ...state.editor, isDirty: true }
        }));

        store.getState().fieldUsage.applyTrackingChanges(TRACKING_PAYLOAD);

        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(false);
    });

    it('exportSpecification derives to false when there is no compilation result, regardless of dirty state', () => {
        const store = makeStore();
        expect(store.getState().compilation.result).toBeNull();

        store.getState().fieldUsage.applyTrackingChanges(TRACKING_PAYLOAD);

        expect(
            selectExportSpecificationCommandEnabled(store.getState())
                .exportSpecification
        ).toBe(false);
    });
});

describe('U2 flow 3 — dataset.updateDataset (handleUpdateDataset) writes create + export.metadata', () => {
    /**
     * `metadataAllDependenciesAssigned` / `metadataAllFieldsAssigned` are
     * computed from `state.create.metadata` (the CREATE dialog's own field
     * mapping) — NOT from the dataset payload passed to `updateDataset`.
     * Seed `create.metadata` directly, the same way `project.test.ts` seeds
     * `export.metadata` for tests that need a specific starting shape.
     */
    const seedCreateMetadataFields = (
        store: ReturnType<typeof makeStore>,
        fields: UsermetaDatasetField[]
    ) =>
        store.setState((state) => ({
            create: {
                ...state.create,
                metadata: {
                    ...state.create.metadata,
                    datasets: { [DATASET_DEFAULT_NAME]: fields }
                } as never
            }
        }));

    it('sets create.metadataAllFieldsAssigned and metadataAllDependenciesAssigned true when every create-metadata field carries a suppliedObjectKey', () => {
        const store = makeStore();
        seedCreateMetadataFields(store, [
            {
                key: '__dataset.0__',
                name: 'Category',
                namePlaceholder: 'Category',
                type: 'text',
                suppliedObjectKey: 'qn-cat',
                suppliedObjectName: 'Category'
            }
        ]);

        store
            .getState()
            .updateDataset({ dataset: { fields: ['Category'], values: [] } });

        expect(store.getState().create).toMatchObject({
            metadataAllFieldsAssigned: true,
            metadataAllDependenciesAssigned: true
        });
    });

    it('sets create.metadataAllFieldsAssigned and metadataAllDependenciesAssigned false when a create-metadata field lacks a suppliedObjectKey', () => {
        const store = makeStore();
        seedCreateMetadataFields(store, [
            {
                key: '__dataset.0__',
                name: 'Category',
                namePlaceholder: 'Category',
                type: 'text'
            }
        ]);

        store
            .getState()
            .updateDataset({ dataset: { fields: ['Category'], values: [] } });

        expect(store.getState().create).toMatchObject({
            metadataAllFieldsAssigned: false,
            metadataAllDependenciesAssigned: false
        });
    });

    it('writes export.metadata.datasets.dataset from the fresh dataset payload when there is no previous export metadata to reconcile against', () => {
        const store = makeStore();

        store.getState().updateDataset({
            dataset: { fields: ['Category', 'Sales'], values: [] }
        });

        const entries =
            store.getState().export.metadata?.datasets?.[DATASET_DEFAULT_NAME];
        expect(entries).toEqual([
            {
                key: '__dataset.0__',
                name: 'Category',
                namePlaceholder: 'Category',
                description: '',
                kind: 'column',
                type: 'other'
            },
            {
                key: '__dataset.1__',
                name: 'Sales',
                namePlaceholder: 'Sales',
                description: '',
                kind: 'column',
                type: 'other'
            }
        ]);
    });

    it('edge case: an unchanged dataset leaves export.metadata.datasets.dataset structurally unchanged (but NOT the same object reference)', () => {
        const store = makeStore();
        const payload = { dataset: { fields: ['Category'], values: [] } };

        store.getState().updateDataset(payload);
        const firstEntries =
            store.getState().export.metadata?.datasets?.[DATASET_DEFAULT_NAME];
        const firstMetadata = store.getState().export.metadata;

        store.getState().updateDataset(payload);
        const secondEntries =
            store.getState().export.metadata?.datasets?.[DATASET_DEFAULT_NAME];
        const secondMetadata = store.getState().export.metadata;

        // Content is unchanged.
        expect(secondEntries).toEqual(firstEntries);
        // Current implementation always spreads a fresh metadata object and
        // reconciles each field into a fresh object literal, so identity is
        // NOT preserved even when nothing meaningfully changed. This is the
        // behaviour U5's upsert-style subscription is expected to improve on
        // (see Key Technical Decisions); pinning it here so a later identity
        // change is a deliberate, visible diff against this test.
        expect(secondMetadata).not.toBe(firstMetadata);
        expect(secondEntries).not.toBe(firstEntries);
    });
});

describe('U2 flow 4a — project.initializeFromTemplate seeds export metadata, editor staged text, selected pane and modal role', () => {
    it('seeds project fields, staged editor text, selects the Spec pane, closes the modal, and leaves the editor clean', () => {
        const store = makeStore();
        // Put the store into a state where every downstream field this
        // action touches has a DIFFERENT value first, so the assertions
        // below prove the write happened rather than matching a default.
        store.getState().updateEditorSelectedOperation('Config');
        store.getState().interface.setModalDialogRole('Create');
        store.getState().fieldUsage.applyFieldMapping({
            dataset: {},
            drilldown: { isCurrent: false, isMappingRequired: false }
        });
        expect(store.getState().fieldUsage.editorShouldSkipRemap).toBe(true);

        store.getState().project.initializeFromTemplate({
            spec: '{"mark":"bar"}',
            config: '{}',
            provider: 'vegaLite'
        });

        const state = store.getState();
        expect(state.project.spec).toBe('{"mark":"bar"}');
        expect(state.project.config).toBe('{}');
        expect(state.project.provider).toBe('vegaLite');
        expect(state.project.__isInitialized__).toBe(true);
        expect(state.editorSelectedOperation).toBe('Spec');
        expect(state.interface.modalDialogRole).toBe('None');
        expect(state.editor.stagedSpec).toBe('{"mark":"bar"}');
        expect(state.editor.stagedConfig).toBe('{}');
        // `updateChanges` compares against `state.project.spec`/`config`,
        // which the preceding `set()` inside `initializeFromTemplate` has
        // ALREADY updated to `payload.spec`/`payload.config` by the time
        // `get().editor.updateChanges` runs. So the dirty check
        // (`project.spec !== text`) is always false here — a freshly
        // created project reports as NOT dirty, even though no compile has
        // happened yet.
        expect(state.editor.isDirty).toBe(false);
        // exportSpecification is recomputed by updateChanges too, but there
        // is no compilation result yet, so it stays disabled regardless of
        // the (false) dirty flag.
        expect(state.commands.exportSpecification).toBe(false);
        // updateChanges' own write into fieldUsage (unrelated to remap
        // dialog removal, R9 scope note: this is editor-to-editor).
        expect(state.fieldUsage.editorShouldSkipRemap).toBe(false);
    });

    it('embeds the supplied supportFieldConfiguration into existing export.metadata dataset entries', () => {
        const store = makeStore();
        store.setState((state) => ({
            export: {
                ...state.export,
                metadata: {
                    ...state.export.metadata!,
                    datasets: {
                        [DATASET_DEFAULT_NAME]: [
                            {
                                key: '__dataset.0__',
                                name: 'Category',
                                namePlaceholder: 'Category',
                                type: 'text'
                            }
                        ]
                    }
                }
            }
        }));

        store.getState().project.initializeFromTemplate({
            spec: '{"mark":"bar"}',
            config: '{}',
            provider: 'vegaLite',
            supportFieldConfiguration: {
                Category: { highlight: true, format: false, formatted: true }
            }
        });

        const entry =
            store.getState().export.metadata?.datasets?.[
                DATASET_DEFAULT_NAME
            ]?.[0];
        expect(entry?.supportFieldConfiguration).toEqual({
            highlight: true,
            format: false,
            formatted: true
        });
        expect(store.getState().export.metadata?.config).toBe('{}');
    });
});

describe('U2 flow 4b — project.setContent updates staged text for both editor roles', () => {
    it('updates project spec/config and stages both roles in the editor slice', () => {
        const store = makeStore();

        store.getState().project.setContent({
            spec: '{"mark":"line"}',
            config: '{"padding":5}'
        });

        const state = store.getState();
        expect(state.project.spec).toBe('{"mark":"line"}');
        expect(state.project.config).toBe('{"padding":5}');
        expect(state.editor.stagedSpec).toBe('{"mark":"line"}');
        expect(state.editor.stagedConfig).toBe('{"padding":5}');
        // Same characterization as initializeFromTemplate: project.spec is
        // already updated to the incoming text before updateChanges reads
        // it, so isDirty comes out false here too.
        expect(state.editor.isDirty).toBe(false);
    });
});

describe('U2 flow 4c/4d — project.setSupportFieldConfiguration / applySupportFieldMigrationStamp write export.metadata', () => {
    it('setSupportFieldConfiguration embeds the per-field flags into export metadata dataset entries and updates project.supportFieldConfiguration', () => {
        const store = makeStore();
        store.setState((state) => ({
            export: {
                ...state.export,
                metadata: {
                    ...state.export.metadata!,
                    datasets: {
                        [DATASET_DEFAULT_NAME]: [
                            {
                                key: '__dataset.0__',
                                name: 'Category',
                                namePlaceholder: 'Category',
                                type: 'text'
                            }
                        ]
                    }
                }
            }
        }));

        store.getState().project.setSupportFieldConfiguration({
            Category: { highlight: true, format: false, formatted: true }
        });

        const state = store.getState();
        expect(state.project.supportFieldConfiguration).toEqual({
            Category: { highlight: true, format: false, formatted: true }
        });
        const entry =
            state.export.metadata?.datasets?.[DATASET_DEFAULT_NAME]?.[0];
        expect(entry?.supportFieldConfiguration).toEqual({
            highlight: true,
            format: false,
            formatted: true
        });
    });

    it('setSupportFieldConfiguration strips embedded config from a field that is no longer configured', () => {
        const store = makeStore();
        store.setState((state) => ({
            export: {
                ...state.export,
                metadata: {
                    ...state.export.metadata!,
                    datasets: {
                        [DATASET_DEFAULT_NAME]: [
                            {
                                key: '__dataset.0__',
                                name: 'Category',
                                namePlaceholder: 'Category',
                                type: 'text',
                                supportFieldConfiguration: {
                                    highlight: true,
                                    format: true,
                                    formatted: true
                                }
                            }
                        ]
                    }
                }
            }
        }));

        store.getState().project.setSupportFieldConfiguration({});

        const entry =
            store.getState().export.metadata?.datasets?.[
                DATASET_DEFAULT_NAME
            ]?.[0];
        expect(entry?.supportFieldConfiguration).toBeUndefined();
    });

    it('applySupportFieldMigrationStamp commits the stamped config/version/consolidate flags AND embeds config into export metadata in one update (deeper atomicity coverage lives in project.test.ts M10)', () => {
        const store = makeStore();
        store.setState((state) => ({
            export: {
                ...state.export,
                metadata: {
                    ...state.export.metadata!,
                    datasets: {
                        [DATASET_DEFAULT_NAME]: [
                            {
                                key: '__dataset.0__',
                                name: 'Category',
                                namePlaceholder: 'Category',
                                type: 'text'
                            }
                        ]
                    }
                }
            }
        }));

        store.getState().project.applySupportFieldMigrationStamp({
            supportFieldConfiguration: {
                Category: { highlight: true, format: true, formatted: true }
            },
            denebMetaVersion: 2,
            consolidateFieldParameters: false
        });

        const state = store.getState();
        expect(state.project.supportFieldConfiguration).toEqual({
            Category: { highlight: true, format: true, formatted: true }
        });
        expect(state.project.denebMetaVersion).toBe(2);
        expect(state.project.consolidateFieldParameters).toBe(false);
        const entry =
            state.export.metadata?.datasets?.[DATASET_DEFAULT_NAME]?.[0];
        expect(entry?.supportFieldConfiguration).toEqual({
            highlight: true,
            format: true,
            formatted: true
        });
    });
});
