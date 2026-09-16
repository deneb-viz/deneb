import { type Spec } from 'vega';
import { type TopLevelSpec } from 'vega-lite';

/**
 * Represents templates that are packaged in the .pbiviz for demo purposes.
 */
export type DenebTemplateCatalog = {
    vega: Spec[];
    vegaLite: TopLevelSpec[];
};
