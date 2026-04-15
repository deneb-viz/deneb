import { TopLevelSpec } from 'vega-lite';

import { VEGA_LITE_SCHEMA_URL } from '.';
import { getDenebTemplateDatasetRef, getNewIncludedTemplateMetadata } from '..';
import { type UsermetaDatasetField } from '@deneb-viz/data-core/field';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';

const dataset: UsermetaDatasetField[] = [
    {
        key: `__${DATASET_DEFAULT_NAME}.0__`,
        name: 'Category',
        description:
            "Select a column that will be displayed on the chart's Y-Axis",
        type: 'text',
        kind: 'column'
    },
    {
        key: `__${DATASET_DEFAULT_NAME}.1__`,
        name: 'Measure',
        description:
            "Select a measure that will be displayed on the chart's X-Axis",
        type: 'numeric',
        kind: 'measure'
    }
];

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
