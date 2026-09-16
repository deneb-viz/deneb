import { Spec } from 'vega';

import {
    getDenebTemplateVegaDatasetRef,
    getDenebTemplateVegaSpecificConfig,
    VEGA_SCHEMA_URL
} from '.';
import { getNewIncludedTemplateMetadata } from '..';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import { getStandardBarDataset } from '../standard-bar-dataset';

const dataset = getStandardBarDataset();

export const vBarSimple = (): Spec => ({
    $schema: VEGA_SCHEMA_URL,
    data: getDenebTemplateVegaDatasetRef(),
    scales: [
        {
            name: 'yscale',
            type: 'band',
            domain: {
                data: DATASET_DEFAULT_NAME,
                field: `__${DATASET_DEFAULT_NAME}.0__`
            },
            range: 'height',
            padding: 0.1,
            round: true
        },
        {
            name: 'xscale',
            domain: {
                data: DATASET_DEFAULT_NAME,
                field: `__${DATASET_DEFAULT_NAME}.1__`
            },
            nice: true,
            range: 'width'
        }
    ],
    axes: [
        {
            scale: 'xscale',
            orient: 'bottom',
            title: `__${DATASET_DEFAULT_NAME}.1__`,
            tickCount: 5
        },
        {
            orient: 'left',
            scale: 'yscale',
            title: `__${DATASET_DEFAULT_NAME}.0__`
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
                        field: `__${DATASET_DEFAULT_NAME}.1__`
                    },
                    x2: {
                        scale: 'xscale',
                        value: 0
                    },
                    y: {
                        scale: 'yscale',
                        field: `__${DATASET_DEFAULT_NAME}.0__`
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
        datasets: { [DATASET_DEFAULT_NAME]: dataset },
        config: getDenebTemplateVegaSpecificConfig()
    }
});
