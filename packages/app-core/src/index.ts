export * from './app';
export {
    useDenebPlatformProvider,
    type LocalisableText,
    type OnCreateProjectPayload,
    type PlatformSearchContribution,
    type PlatformSearchRow,
    type ViewEventBinder
} from './components/deneb-platform';
export {
    handleDiscardChanges,
    handlePersistSpecification
} from './lib/commands';
export { type I18nLocale, type Translations } from './lib/i18n';
export * from './state';

// TEMPORARY API WHILE WE HOIST APP OUT OF POWER BI
export * from './components/template-metadata';
export * from './components/ui';
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

export { updateFieldTracking } from './lib/field-processing';
export * from './lib/interface';
export {
    markEditorOpenStart,
    markEditorOpenStage,
    flushEditorOpenTimings,
    type EditorOpenStage
} from './lib/perf';
export { INCREMENTAL_UPDATE_CONFIGURATION } from './lib/vega/incremental-update-configuration';
