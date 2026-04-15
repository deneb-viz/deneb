import { Spec } from 'vega';

import {
    getDenebTemplateVegaDatasetRef,
    getDenebTemplateVegaSpecificConfig,
    VEGA_SCHEMA_URL
} from '.';
import { getNewIncludedTemplateMetadata } from '..';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';

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
        datasets: { [DATASET_DEFAULT_NAME]: [] },
        config: getDenebTemplateVegaSpecificConfig()
    }
});
