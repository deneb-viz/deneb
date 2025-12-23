import { TopLevelSpec } from 'vega-lite';

import { VEGA_LITE_SCHEMA_URL, getTemplatePowerBiConfigVl } from '.';
import { getDenebTemplateDatasetRef, getNewIncludedTemplateMetadata } from '..';

export const vlEmptyConfig = (): TopLevelSpec => ({
    $schema: VEGA_LITE_SCHEMA_URL,
    data: getDenebTemplateDatasetRef(),
    layer: [],
    usermeta: {
        ...getNewIncludedTemplateMetadata(
            'vegaLite',
            '[empty (with Power BI theming)]',
            'Bare-minimum Vega-Lite template, with data-binding pre-populated. Contains configuration defaults for marks and axes to provide a Power BI-like look and feel.'
        ),
        config: getTemplatePowerBiConfigVl()
    }
});
