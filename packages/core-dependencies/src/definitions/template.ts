import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';

/**
 * Which mode we wish to use to instantiate our new specification.
 */
export type CreateMode = 'import' | 'vegaLite' | 'vega';

/**
 * Used to manage regex match/replace for portions of a template that represent fields from the dataset.
 */
export type DenebTemplateDataFieldReplacerPattern = {
    match: string;
    replacer: string;
};

/**
 * Denotes the role that a column performs, allowing us to switch based on this value.
 */
export type DenebTemplateDatasetColumnRole =
    | 'type'
    | 'name'
    | 'assignment'
    | 'description'
    | 'originalName'
    | 'exportName'
    | 'exportDescription';

/**
 * Stages we go through when importing a template so that the interface can respond accordingly.
 */
export type DenebTemplateImportState = 'None' | 'Supplied' | 'Loading' | 'Validating' | 'Success' | 'Error';

/**
 * Represents templates that are packaged in the .pbiviz for demo purposes.
 */
export type DenebTemplatesIncluded = {
    vega: Spec[];
    vegaLite: TopLevelSpec[];
};

/**
 * Because we're using JSONC, it's much easier to store the intended spec and config content as a string when we need
 * to work with the APIs (and also when we need to update placeholders etc. prior to create). This interface allows us
 * to store both of the intended strings for transport to and from the store, and other places we need them.
 */
export interface IDenebTemplateAllocationComponents {
    spec: string;
    config: string;
}
