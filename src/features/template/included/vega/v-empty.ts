import { Spec } from 'vega';

import {
    getDenebTemplateVegaDatasetRef,
    getDenebTemplateVegaSpecificConfig,
    VEGA_SCHEMA_URL
} from '.';
import { getNewIncludedTemplateMetadata } from '..';

export const vEmpty = (): Spec => ({
    $schema: VEGA_SCHEMA_URL,
    data: getDenebTemplateVegaDatasetRef(),
    marks: [],
    usermeta: {
        ...getNewIncludedTemplateMetadata(
            'vega',
            '[empty]',
            'Bare-minimum Vega template, with data-binding pre-populated. Has no additional configuration for styling.'
        ),
        config: getDenebTemplateVegaSpecificConfig()
    }
});
