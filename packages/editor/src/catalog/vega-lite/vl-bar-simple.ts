import { TopLevelSpec } from 'vega-lite';

import { VEGA_LITE_SCHEMA_URL } from '.';
import { getDenebTemplateDatasetRef, getNewIncludedTemplateMetadata } from '..';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import { getStandardBarDataset } from '../standard-bar-dataset';

const dataset = getStandardBarDataset();

export const vlBarSimple = (): TopLevelSpec => ({
    $schema: VEGA_LITE_SCHEMA_URL,
    data: getDenebTemplateDatasetRef(),
    mark: {
        type: 'bar'
    },
    encoding: {
        y: {
            field: `__${DATASET_DEFAULT_NAME}.0__`,
            type: 'nominal'
        },
        x: {
            field: `__${DATASET_DEFAULT_NAME}.1__`,
            type: 'quantitative'
        }
    },
    usermeta: {
        ...getNewIncludedTemplateMetadata(
            'vegaLite',
            'Simple bar chart',
            'A simple bar chart for a category and a measure.',
            'vlBarSimple'
        ),
        datasets: { [DATASET_DEFAULT_NAME]: dataset }
    }
});
