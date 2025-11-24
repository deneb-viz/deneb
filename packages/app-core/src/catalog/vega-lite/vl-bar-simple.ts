import { TopLevelSpec } from 'vega-lite';

import { VEGA_LITE_SCHEMA_URL } from '.';
import { getDenebTemplateDatasetRef, getNewIncludedTemplateMetadata } from '..';
import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';

const dataset: UsermetaDatasetField[] = [
    {
        key: '__0__',
        name: 'Category',
        description:
            "Select a column that will be displayed on the chart's Y-Axis",
        type: 'text',
        kind: 'column'
    },
    {
        key: '__1__',
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
            field: '__0__',
            type: 'nominal'
        },
        x: {
            field: '__1__',
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
        ...{ dataset }
    }
});
