import { Spec } from 'vega';

import {
    getDenebTemplateVegaDatasetRef,
    getDenebTemplateVegaSpecificConfig,
    VEGA_SCHEMA_URL
} from '.';
import { getNewIncludedTemplateMetadata } from '..';
import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/dataset/data';

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

export const vBarSimple = (): Spec => ({
    $schema: VEGA_SCHEMA_URL,
    data: getDenebTemplateVegaDatasetRef(),
    scales: [
        {
            name: 'yscale',
            type: 'band',
            domain: {
                data: DATASET_DEFAULT_NAME,
                field: '__0__'
            },
            range: 'height',
            padding: 0.1,
            round: true
        },
        {
            name: 'xscale',
            domain: {
                data: DATASET_DEFAULT_NAME,
                field: '__1__'
            },
            nice: true,
            range: 'width'
        }
    ],
    axes: [
        {
            scale: 'xscale',
            orient: 'bottom',
            title: '__1__',
            tickCount: 5
        },
        {
            orient: 'left',
            scale: 'yscale',
            title: '__0__'
        }
    ],
    marks: [
        {
            type: 'rect',
            from: {
                data: DATASET_DEFAULT_NAME
            },
            encode: {
                enter: {
                    x: {
                        scale: 'xscale',
                        field: '__1__'
                    },
                    x2: {
                        scale: 'xscale',
                        value: 0
                    },
                    y: {
                        scale: 'yscale',
                        field: '__0__'
                    },
                    height: {
                        scale: 'yscale',
                        band: 1
                    }
                }
            }
        }
    ],
    usermeta: {
        ...getNewIncludedTemplateMetadata(
            'vega',
            'Simple bar chart',
            'A simple bar chart for a category and a measure.',
            'vBarSimple'
        ),
        ...{ dataset, config: getDenebTemplateVegaSpecificConfig() }
    }
});
