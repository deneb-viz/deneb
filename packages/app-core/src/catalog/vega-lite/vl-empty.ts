import { TopLevelSpec } from 'vega-lite';

import { VEGA_LITE_SCHEMA_URL } from '.';
import { getDenebTemplateDatasetRef, getNewIncludedTemplateMetadata } from '..';

export const vlEmpty = (): TopLevelSpec => ({
    $schema: VEGA_LITE_SCHEMA_URL,
    data: getDenebTemplateDatasetRef(),
    layer: [],
    usermeta: getNewIncludedTemplateMetadata(
        'vegaLite',
        '[empty]',
        'Bare-minimum Vega-Lite template, with data-binding pre-populated. Has no additional configuration for styling.'
    )
});
