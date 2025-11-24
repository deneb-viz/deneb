import { Spec } from 'vega';

import {
    getDenebTemplateVegaDatasetRef,
    getDenebTemplateVegaSpecificConfig,
    VEGA_SCHEMA_URL
} from '.';
import { getNewIncludedTemplateMetadata } from '..';

export const vEmptyConfig = (): Spec => ({
    $schema: VEGA_SCHEMA_URL,
    data: getDenebTemplateVegaDatasetRef(),
    marks: [],
    usermeta: {
        ...getNewIncludedTemplateMetadata(
            'vega',
            '[empty (with Power BI theming)]',
            'Bare-minimum Vega template, with data-binding pre-populated. Contains configuration defaults for marks and axes to provide a Power BI-like look and feel.'
        ),
        config: getDenebTemplateVegaSpecificConfig(true)
    }
});
