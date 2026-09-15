import type { CommandsSlice } from './commands';
import type { DebugSlice } from './debug';
import type { EditorSlice } from './editor';
import type { ExportSliceState } from './export';
import type { FieldUsageSliceState } from './field-usage';
import type { SettingsPaneSlice } from './settings-pane';
// Loads zustand's devtools mutator declaration
// (`StoreMutators['zustand/devtools']`), which every slice creator's mutator
// tuple names; app-core's emitted types do not carry it across.
import type {} from 'zustand/middleware';

/**
 * The slices that only exist once `installEditorState()` has run. Not
 * present in a freshly constructed app-core store.
 */
export type EditorStoreSlices = CommandsSlice &
    DebugSlice &
    EditorSlice &
    ExportSliceState &
    FieldUsageSliceState &
    SettingsPaneSlice;

/**
 * Extends app-core's store shape with the editor slices, so every
 * consumer reads them through the same `useDenebState` / `getDenebState`
 * (one store, one devtools instance). Only true at runtime after
 * `installEditorState()`; `useEditorState` / `requireEditorState` guard
 * editor-side reads until then.
 */
declare module '@deneb-viz/app-core' {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation; the members are the editor slices
    interface StoreState extends EditorStoreSlices {}
}
