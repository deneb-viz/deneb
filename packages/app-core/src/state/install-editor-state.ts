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

    // U5 (docs/plans/2026-09-15-001-refactor-editor-package-extraction-plan.md)
    // — the editor-side subscriptions that replace the cross-slice writes
    // removed from `state/project.ts` and `state/dataset.ts`. Registered
    // here, not in a separate call, so a single `installEditorState()` is
    // the one place that makes the editor slices AND their subscriptions
    // live together, and so the idempotency guard above also protects
    // against double-registering them.
    //
    // Zustand's `store.subscribe((state, prev) => ...)` fires listeners
    // SYNCHRONOUSLY, in registration order, as part of the `set()` call
    // that changed the state — including nested `set()` calls made from
    // inside a listener (e.g. `state.editor.updateChanges(...)` below is
    // itself an action that calls `set()`). That nested call re-runs this
    // same `forEach` over all three listeners below with `prev` fixed at
    // the nested call's own start, so a listener whose condition depends
    // on `project`/`dataset` sees them unchanged during a nested,
    // editor-only transition and does not re-fire. Each of the three
    // subscriptions below keys off a different, disjoint set of top-level
    // properties (`project.contentCommitCount`;
    // `project.initializationCount`; `project`/`dataset` as a whole) for
    // exactly this reason — no subscription's own nested writes can
    // trigger another subscription (or itself) a second time for the
    // same outer transition.
    //
    // Registration-order invariant (see the doc comment above): this
    // runs before the visual's own store-synchronization subscribers.

    // 1. Staged-text refresh — reproduces the `get().editor.updateChanges(...)`
    // calls that used to run directly, UNCONDITIONALLY, inside
    // `initializeFromTemplate` and `setContent` for BOTH roles on every
    // call. Keyed on `project.contentCommitCount` (bumped by exactly
    // those two actions — see the doc comment in `state/project.ts`)
    // rather than on `project.spec`/`config` value equality: a value-diff
    // gate would silently skip the refresh whenever the incoming text
    // coincidentally matches what was already there (e.g. a template
    // whose config is the empty-object default), which is a real,
    // observed case, not a theoretical one. Fires for neither `setProvider`
    // et al. (which don't touch `contentCommitCount`) nor host-driven
    // `syncProjectData` (which never called `updateChanges` either).
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

    // 2. Create signal — reproduces the `editorSelectedOperation: 'Spec'`
    // write that used to run directly inside `initializeFromTemplate`,
    // and additionally requests editor focus (the create button used to
    // do this itself via a direct Monaco ref call — see
    // `features/project-create/components/create-button.tsx`, left for
    // U6 to drop). `initializationCount` is bumped ONLY by
    // `initializeFromTemplate` (see the doc comment in `state/project.ts`),
    // so this does not fire for `setContent` or host-driven
    // `syncProjectData`, both of which must leave the selected pane and
    // focus alone.
    store.subscribe((state, prev) => {
        if (
            state.project.initializationCount !==
            prev.project.initializationCount
        ) {
            state.updateEditorSelectedOperation('Spec');
            state.requestEditorFocus();
        }
    });

    // 3. Export metadata — reproduces the `export.metadata` writes that
    // used to run inside `initializeFromTemplate`, `setContent`,
    // `setSupportFieldConfiguration`, `applySupportFieldMigrationStamp`
    // and `syncProjectData` (state/project.ts) and `updateDataset`
    // (state/dataset.ts). See `recomputeExportMetadata` in
    // `state/export.ts` for why this recomputes on every `project`
    // change rather than only on the narrower set of fields those five
    // project.ts write sites individually touched.
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
