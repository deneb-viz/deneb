import { createCommandsSlice } from './commands';
import { createDebugSlice } from './debug';
import { createEditorSlice } from './editor';
import { createExportSlice } from './export';
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
 * onto a fresh, isolated store (`createDenebState(deps)` followed by
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
 * fieldUsage, settingsPane) into an existing Deneb store. Every app
 * that mounts editor UI (the visual, the web sample) must call this
 * once, before the first editor-state read — the retained editor's
 * first render is the first such read in the visual, and it throws a
 * clear error (see `editor-state-access.ts`) if this was skipped.
 *
 * Idempotent: if the editor slices are already present on the store,
 * this returns immediately. Without that guard, a second call would
 * re-run every slice creator's initializer, replacing already-mutated
 * editor state (e.g. staged text, dirty flags) with fresh defaults, and
 * — once U5 registers subscriptions here — would double-subscribe them.
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

    // U5 will register the editor-side subscriptions here (the export
    // metadata upsert on project/dataset change, and the staged-text
    // refresh on project spec/config change), once those cross-slice
    // writes are removed from `state/project.ts` and `state/dataset.ts`.
    // They belong here, not in a separate call, so a single
    // `installEditorState()` is the one place that makes the editor
    // slices AND their subscriptions live together.
};
