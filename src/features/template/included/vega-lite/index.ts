/**
 * Vega-Lite templates that are included with Deneb.
 */
import { PROVIDER_RESOURCES } from '../../../../../config';

/**
 * Schema URL for all templates.
 */
export const VEGA_LITE_SCHEMA_URL = PROVIDER_RESOURCES.vegaLite.schemaUrl;

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
