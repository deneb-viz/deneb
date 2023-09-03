import { Config, Spec } from 'vega';

import { getDenebTemplateVegaDatasetRef, VEGA_SCHEMA_URL } from '.';
import { getNewIncludedTemplateMetadata } from '..';
import { powerBiThemeVega } from '../../../vega-extensibility/extensibility/powerbi-theme';

export const vEmptyConfig = (): Spec => ({
    $schema: VEGA_SCHEMA_URL,
    data: getDenebTemplateVegaDatasetRef(),
    config: { ...powerBiThemeVega() } as Config,
    marks: [],
    usermeta: getNewIncludedTemplateMetadata(
        'vega',
        '[empty (with Power BI theming)]',
        'Bare-minimum Vega template, with data-binding pre-populated. Contains configuration defaults for marks and axes to provide a Power BI-like look and feel.'
    )
});
