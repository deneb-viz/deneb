export * from './app';
export {
    useDenebPlatformProvider,
    type LocalisableText,
    type OnCreateProjectPayload,
    type PlatformSearchContribution,
    type PlatformSearchRow,
    type ViewEventBinder
} from './components/deneb-platform';
// Imported directly from the component file (not the './components/ui'
// barrel): the barrel's `export * from './toolbar'` transitively reaches
// `toolbar-button-standard.tsx`, which imports `useSpecificationEditor`
// (editor-only). Going straight to the file keeps the viewer entry's
// reachability graph clean of that coupling.
export { Hyperlink } from './components/ui/hyperlink';
export { type I18nLocale, type Translations } from './lib/i18n';
export * from './state';
export * from './lib/interface';
export { INCREMENTAL_UPDATE_CONFIGURATION } from './lib/vega/incremental-update-configuration';
