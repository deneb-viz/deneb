import { devtools } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';

import { createCompilationSlice, type CompilationSlice } from './compilation';
import { createCreateSlice, type CreateSliceState } from './create';
import { createDatasetSlice, type DatasetSlice } from './dataset';
import {
    createEditorPreferencesSlice,
    EditorPreferencesSlice
} from './editor-preferences';
import { createI18nSlice, I18nSlice } from './i18n';
import { createInterfaceSlice, type InterfaceSlice } from './interface';
import { createMigrationSlice, type MigrationSlice } from './migration';
import { createProjectSlice, type ProjectSlice } from './project';
import {
    createVisualRenderSlice,
    type VisualRenderSlice
} from './visual-render';
import { toBoolean } from '@deneb-viz/utils/type-conversion';
import type { CommandsSlice } from './commands';
import type { DebugSlice } from './debug';
import type { EditorSlice } from './editor';
import type { ExportSliceState } from './export';
import type { FieldUsageSliceState } from './field-usage';
import type { SettingsPaneSlice } from './settings-pane';

/**
 * The slices that are always present: viewer-live state plus the pieces
 * every app (visual and web sample) needs regardless of whether the
 * editor is mounted. This is the generic every core slice creator and
 * `createDenebState` are typed against, so core code cannot reference
 * editor-only state — a missing editor slice is a compile error here,
 * not a runtime surprise.
 */
export type CoreStoreState = CompilationSlice &
    CreateSliceState &
    DatasetSlice &
    EditorPreferencesSlice &
    I18nSlice &
    InterfaceSlice &
    MigrationSlice &
    ProjectSlice &
    VisualRenderSlice;

/**
 * The slices that only exist once `installEditorState()` has run. Not
 * present in a freshly constructed store.
 */
export type EditorStoreSlices = CommandsSlice &
    DebugSlice &
    EditorSlice &
    ExportSliceState &
    FieldUsageSliceState &
    SettingsPaneSlice;

/**
 * The full store shape consumers see through `useDenebState` /
 * `getDenebState`. A freshly constructed store only actually satisfies
 * `CoreStoreState` at runtime until `installEditorState()` merges the
 * editor slices in — see the cast in `createDenebState` below.
 */
export type StoreState = CoreStoreState & EditorStoreSlices;

export type StateDependencies = {
    applicationVersion: string;
};

/**
 * A slice of state that can be synchronized and hydrated.
 */
export type SyncableSlice = {
    /**
     * Indicates whether the slice has been hydrated from an external source. This can be used by subscribers to
     * determine if they should perform synchronization actions.
     */
    __hasHydrated__: boolean;
};

/**
 * Builds a fresh Deneb store from the core slices only.
 */
export const createDenebState = () =>
    createWithEqualityFn<StoreState>()(
        devtools(
            (...a) =>
                // Only core slices are assembled here, so this cast to
                // `StoreState` — the only cast of its kind — is made
                // true at runtime by `installEditorState()`, which merges
                // the editor slices in before any editor read.
                ({
                    ...createCompilationSlice()(...a),
                    ...createCreateSlice()(...a),
                    ...createDatasetSlice()(...a),
                    ...createEditorPreferencesSlice()(...a),
                    ...createI18nSlice()(...a),
                    ...createInterfaceSlice()(...a),
                    ...createMigrationSlice()(...a),
                    ...createProjectSlice()(...a),
                    ...createVisualRenderSlice()(...a)
                }) as StoreState,
            { enabled: toBoolean(process.env.ZUSTAND_DEV_TOOLS) }
        ),
        shallow
    );

/**
 * Set up a singleton Deneb state store.
 * TODO: eventually move to dependency injection pattern.
 */
const useDenebState = createDenebState();
const getDenebState = () => useDenebState.getState();

export { getDenebState, useDenebState };
