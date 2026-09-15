import { deepEqual } from 'fast-equals';
import { createCommandsSlice } from './commands';
import { createDebugSlice } from './debug';
import { createEditorSlice } from './editor';
import { createExportSlice, recomputeExportMetadata } from './export';
import { createFieldUsageSlice } from './field-usage';
import { createSettingsPaneSlice } from './settings-pane';
import { APPLICATION_VERSION } from '../lib/application';
import {
    useDenebState,
    type StateDependencies,
    type StoreState
} from './state';

/**
 * The store type `installEditorState` operates on: the same shape
 * `useDenebState` (and any store built by `createDenebState`) has.
 * Accepting an explicit store here — rather than reaching for the
 * singleton internally — is what lets tests install the editor slices
 * onto a fresh, isolated store (`createDenebState()` followed by
 * `installEditorState(store, deps)`) instead of only the module-level
 * singleton.
 */
type DenebStateStore = typeof useDenebState;

/**
 * True once every editor-only slice has been merged into `state`. The
 * install below applies all editor slices in one `setState` call, so
 * checking for a single representative key (`editor`) is sufficient —
 * there is no window where some editor slices are present and others
 * are not.
 */
export const isEditorStateInstalled = (state: StoreState): boolean =>
    'editor' in state;

/**
 * Merges the editor-only slices (commands, debug, editor, export,
 * fieldUsage, settingsPane) into an existing Deneb store and registers
 * the editor-side subscriptions below. Every app that mounts editor UI
 * (the visual, the web sample) must call this once, before the first
 * editor-state read.
 *
 * Idempotent: if the editor slices are already present on the store,
 * this returns immediately — otherwise a second call would replace
 * already-mutated editor state (e.g. staged text, dirty flags) with
 * fresh defaults and double-register the subscriptions.
 *
 * Registration-order invariant: this is expected to run before the
 * visual's own store-synchronization subscribers are registered
 * (`initializeStoreSynchronization()` in `apps/deneb/src/index.ts`).
 * That ordering is currently benign either way because none of the
 * visual's sync subscribers read editor state — persistence only reads
 * core slices (project, editor-preferences, visual-render,
 * compilation). If a future sync subscriber needs editor state, this
 * ordering becomes load-bearing and should be re-verified.
 */
export const installEditorState = (
    store: DenebStateStore = useDenebState,
    dependencies: StateDependencies = {
        applicationVersion: APPLICATION_VERSION
    }
): void => {
    if (isEditorStateInstalled(store.getState())) {
        return;
    }

    const { setState, getState } = store;

    const editorSlices: Partial<StoreState> = {
        ...createCommandsSlice()(setState, getState, store),
        ...createDebugSlice()(setState, getState, store),
        ...createEditorSlice()(setState, getState, store),
        ...createExportSlice(dependencies)(setState, getState, store),
        ...createFieldUsageSlice()(setState, getState, store),
        ...createSettingsPaneSlice()(setState, getState, store)
    };

    // Single setState call: every editor slice becomes visible to
    // subscribers and re-renders in one commit, not one per slice.
    store.setState(editorSlices, false, 'editor.install');

    // Zustand listeners fire synchronously inside the `set()` call that
    // changed the state, including nested `set()` calls made from inside
    // a listener. Each subscription below keys on a disjoint field so a
    // nested `set()` cannot re-trigger another subscription (or itself).

    // 1. Staged-text refresh — fires when `project.contentCommitCount`
    // changes; pushes the current spec and config text into the editor
    // for both roles.
    store.subscribe((state, prev) => {
        if (
            state.project.contentCommitCount !== prev.project.contentCommitCount
        ) {
            state.editor.updateChanges({
                role: 'Spec',
                text: state.project.spec
            });
            state.editor.updateChanges({
                role: 'Config',
                text: state.project.config
            });
        }
    });

    // 2. Create signal — fires when `project.initializationCount`
    // changes; selects the Spec pane and requests editor focus.
    store.subscribe((state, prev) => {
        if (
            state.project.initializationCount !==
            prev.project.initializationCount
        ) {
            state.updateEditorSelectedOperation('Spec');
            state.requestEditorFocus();
        }
    });

    // 3. Export metadata — fires when `project` or `dataset` changes;
    // recomputes `export.metadata` (see `recomputeExportMetadata` in
    // `state/export.ts`).
    store.subscribe((state, prev) => {
        const projectChanged = state.project !== prev.project;
        const datasetChanged = state.dataset !== prev.dataset;
        if (!projectChanged && !datasetChanged) {
            return;
        }
        const metadata = recomputeExportMetadata(
            state.export.metadata,
            state.project,
            state.dataset,
            datasetChanged
        );
        // Skip the write when the recomputed metadata is structurally
        // identical — avoids an export-slice re-render on every
        // project/dataset change that doesn't actually affect export
        // metadata.
        if (deepEqual(metadata, state.export.metadata)) {
            return;
        }
        store.setState(
            (current) => ({
                export: { ...current.export, metadata }
            }),
            false,
            'export.recomputeExportMetadata'
        );
    });
};
