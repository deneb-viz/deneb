import { TSpecProvider } from '../../core/vega';

/**
 * Used to indicate which part of the export dialog has focus.
 */
export type TExportOperation = 'information' | 'dataset' | 'template';

/**
 * Stages we go through when exporting a template so that the interface can
 * respond accordingly.
 */
export type TTemplateExportState =
    | 'None'
    | 'Validating'
    | 'Editing'
    | 'Success'
    | 'Error';

/**
 * Stages we go through when importing a template so that the interface can
 * respond accordingly.
 */
export type TTemplateImportState =
    | 'None'
    | 'Supplied'
    | 'Loading'
    | 'Validating'
    | 'Success'
    | 'Error';

/**
 * Extension of `TSpecProvider`, providing an `import` value in addition to
 * `vega` and `vegaLite`.
 */
export type TTemplateProvider = TSpecProvider | 'import';
