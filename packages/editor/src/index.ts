export { DenebEditor } from './app/deneb-editor';
export { RetainedDenebEditor } from './app/retained-deneb-editor';
export { installEditorState } from './state/install-editor-state';
export { useEditorState } from './state/editor-state-access';

export {
    SettingsAccordionItem,
    spinButtonStyleSlots,
    useSettingsPaneStyles,
    useSettingsPaneTooltip
} from './features/settings-pane';
export {
    specificationEditorRefs,
    useSpecificationEditor
} from './context/specification-editor';
export { type SpecificationEditorRefs } from './lib/editor/specification-editor-refs';
export {
    handleDiscardChanges,
    handlePersistSpecification
} from './lib/commands';
export {
    markEditorOpenStart,
    markEditorOpenStage,
    flushEditorOpenTimings,
    type EditorOpenStage
} from './lib/perf';
export { copyToClipboard } from './lib/clipboard';
export { updateFieldTracking } from './lib/field-processing';

// Load-bearing, not a convenience: the DTS bundler only keeps a module in
// `dist/index.d.ts` when the entry's export graph reaches it, and
// `editor-augmentation.ts` carries the `declare module '@deneb-viz/app-core'`
// block that gives consumers the editor slices on `StoreState`. Removing
// this export silently drops that augmentation from the emitted types.
export type { EditorStoreSlices } from './state/editor-augmentation';
