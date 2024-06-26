/**
 * Vega templates that are included with Deneb.
 */
import { getDenebTemplateDatasetRef } from '..';
import { PROVIDER_RESOURCES } from '../../../../../config';
import { powerBiThemeVega } from '../../../vega-extensibility';

/**
 * Schema URL for all templates.
 */
export const VEGA_SCHEMA_URL = PROVIDER_RESOURCES.vega.schemaUrl;

/**
 * Vega specifications allow multiple datasets to be bound, so this provides
 * a Vega-centric version of the `DENEB_TEMPLATE_DATASET_REF` object.
 */
export const getDenebTemplateVegaDatasetRef = () => [
    getDenebTemplateDatasetRef()
];

/**
 * For Vega, we need to add some extra configuration, so we'll do this here.
 */
export const getDenebTemplateVegaSpecificConfig = (includeTheme = false) =>
    JSON.stringify(
        {
            autosize: { contains: 'padding', type: 'fit' },
            ...(includeTheme && powerBiThemeVega())
        },
        null,
        2
    );

import { vEmpty } from './v-empty';
import { vEmptyConfig } from './v-empty-config';
import { vBarSimple } from './v-bar-simple';
import { vBarInteractive } from './v-bar-interactive';

/**
 * Included Vega templates (for use in the create process).
 */
export const VEGA_INCLUDED_TEMPLATES = [
    vEmpty,
    vEmptyConfig,
    vBarSimple,
    vBarInteractive
];
