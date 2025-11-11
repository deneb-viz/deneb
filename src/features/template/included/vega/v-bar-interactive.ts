import { Spec } from 'vega';

import {
    getDenebTemplateVegaDatasetRef,
    getDenebTemplateVegaSpecificConfig,
    VEGA_SCHEMA_URL
} from '.';
import { getNewIncludedTemplateMetadata } from '..';
import { DATASET_NAME, DATASET_SELECTED_NAME } from '../../../../constants';
import { PROPERTIES_DEFAULTS } from '@deneb-viz/core-dependencies';
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

// eslint-disable-next-line max-lines-per-function
export const vBarInteractive = (): Spec => ({
    $schema: VEGA_SCHEMA_URL,
    data: getDenebTemplateVegaDatasetRef(),
    scales: [
        {
            name: 'yscale',
            type: 'band',
            domain: {
                data: DATASET_NAME,
                field: '__0__'
            },
            range: 'height',
            padding: 0.1,
            round: true
        },
        {
            name: 'xscale',
            domain: {
                data: DATASET_NAME,
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
                data: DATASET_NAME
            },
            encode: {
                enter: {
                    tooltip: {
                        signal: "{'__0__': datum['__0__'], '__1__': datum['__1__']}"
                    },
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
                    },
                    opacity: { value: 0.3 }
                }
            }
        },
        {
            type: 'rect',
            from: {
                data: DATASET_NAME
            },
            encode: {
                enter: {
                    tooltip: {
                        signal: "{'__0__': datum['__0__'], '__1__': datum['__1__']}"
                    },
                    x: {
                        scale: 'xscale',
                        field: '__1____highlight'
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
                    },
                    opacity: [
                        {
                            test: `datum.${DATASET_SELECTED_NAME} == 'off'`,
                            value: 0
                        }
                    ]
                }
            }
        }
    ],
    usermeta: {
        ...getNewIncludedTemplateMetadata(
            'vega',
            'Interactive bar chart',
            'An evolution of the simple bar chart, with tooltips, cross-filtering and cross-highlighting, compatible with Power BI.',
            'vBarInteractive'
        ),
        ...{
            dataset,
            interactivity: {
                tooltip: true,
                contextMenu: true,
                highlight: true,
                selection: true,
                dataPointLimit: PROPERTIES_DEFAULTS.vega.selectionMaxDataPoints
            },
            config: getDenebTemplateVegaSpecificConfig()
        }
    }
});
