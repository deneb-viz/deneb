/**
 * Vega-Lite templates that are included with Deneb.
 */
import { getPowerBiThemeBase } from '@deneb-viz/vega-runtime/extensibility';
import { getProviderSchemaUrl } from '@deneb-viz/vega-runtime/embed';

/**
 * Schema URL for all templates (derived from bundled Vega-Lite runtime version).
 */
export const VEGA_LITE_SCHEMA_URL = getProviderSchemaUrl('vegaLite');

import { vlEmpty } from './vl-empty';
import { vlEmptyConfig } from './vl-empty-config';
import { vlBarSimple } from './vl-bar-simple';
import { vlBarInteractive } from './vl-bar-interactive';

/**
 * Included Vega templates (for use in the create process).
 */
export const VEGA_LITE_INCLUDED_TEMPLATES = [
    vlEmpty,
    vlEmptyConfig,
    vlBarSimple,
    vlBarInteractive
];

/**
 * Adds the Power BI themeing for Vega-Lite as a formatted string to templates that need it.
 */
export const getTemplatePowerBiConfigVl = () =>
    JSON.stringify(getPowerBiThemeBase(), null, 2);
