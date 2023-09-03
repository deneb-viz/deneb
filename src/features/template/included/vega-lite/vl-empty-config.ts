import { Config, TopLevelSpec } from 'vega-lite';

import { VEGA_LITE_SCHEMA_URL } from '.';
import { getDenebTemplateDatasetRef, getNewIncludedTemplateMetadata } from '..';
import { powerbiTheme } from '../../../vega-extensibility/extensibility/powerbi-theme';

export const vlEmptyConfig = (): TopLevelSpec => ({
    $schema: VEGA_LITE_SCHEMA_URL,
    data: getDenebTemplateDatasetRef(),
    config: { ...powerbiTheme() } as Config,
    layer: [],
    usermeta: getNewIncludedTemplateMetadata(
        'vegaLite',
        '[empty (with Power BI theming)]',
        'Bare-minimum Vega-Lite template, with data-binding pre-populated. Contains configuration defaults for marks and axes to provide a Power BI-like look and feel.'
    )
});
