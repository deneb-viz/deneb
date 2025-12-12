// TEMPORARY API WHILE WE HOIST APP OUT OF POWER BI
export { SplitPaneOutput } from './app/editor/split-pane-output';
export { PortalRoot } from './app/editor/portal-root';
export {
    monaco,
    setupMonacoWorker
} from './components/code-editor/monaco-integration';
export * from './components/template-metadata';
export * from './components/ui';
export * from './components/visual-viewer';
export * from './features/command-bar';
export * from './features/debug-area';
export * from './features/editor-area';
export * from './features/preview-area';
export * from './features/remap-fields';
export * from './features/settings-pane';
export * from './features/specification-editor';
export * from './lib/commands';
export * from './lib/field-processing';
export * from './lib/interface';
export * from './lib/vega';
export * from './state';
