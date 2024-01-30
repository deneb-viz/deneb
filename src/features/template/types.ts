import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';

/**
 * Denotes the role that a column performs, allowing us to switch based this
 * value.
 */
export type TemplateDatasetColumnRole =
    | 'type'
    | 'name'
    | 'assignment'
    | 'description'
    | 'originalName'
    | 'exportName'
    | 'exportDescription';

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
 * Represents templates that are packaged in the .pbiviz for demo purposes.
 */
export interface IDenebTemplatesIncluded {
    vega: Spec[];
    vegaLite: TopLevelSpec[];
}

/**
 * Used to manage regex match/replace for portions of a template that represent
 * fields from the dataset.
 */
export interface ITemplatePattern {
    match: string;
    replacer: string;
}
