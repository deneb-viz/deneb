// TEMPORARY API WHILE WE HOIST APP OUT OF POWER BI
export { PortalRoot } from './app/editor/portal-root';
export {
    monaco,
    setupMonacoWorker
} from './components/code-editor/monaco-integration';
export {
    datasetViewerWorker,
    type IWorkerDatasetViewerDataTableRow,
    type IWorkerDatasetViewerMaxDisplayWidths,
    type IWorkerDatasetViewerMessage,
    type IWorkerDatasetViewerTranslations
} from './components/data-viewer/workers';
export * from './components/template-metadata';
export * from './components/ui';
export * from './features/debug-area';
export * from './features/project-create';
export * from './features/remap-fields';
export * from './features/specification-editor';
export * from './lib/commands';
export * from './lib/interface';
export * from './lib/vega';
export * from './state';
