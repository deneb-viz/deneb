import { Spec } from 'vega';

import {
    getDenebTemplateVegaDatasetRef,
    getDenebTemplateVegaSpecificConfig,
    VEGA_SCHEMA_URL
} from '.';
import { getNewIncludedTemplateMetadata } from '..';
import { INTERACTIVITY_DEFAULTS } from '@deneb-viz/powerbi-compat/interactivity';
import {
    SELECTED_ROW_FIELD_NAME,
    type UsermetaDatasetField
} from '@deneb-viz/data-core/field';
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
        kind: 'measure',
        supportFieldConfiguration: {
            highlight: true,
            highlightStatus: false,
            highlightComparator: false,
            format: false,
            formatted: false
        }
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
                    tooltip: {
                        signal: `{'__${DATASET_DEFAULT_NAME}.0__': datum['__${DATASET_DEFAULT_NAME}.0__'], '__${DATASET_DEFAULT_NAME}.1__': datum['__${DATASET_DEFAULT_NAME}.1__']}`
                    },
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
                    },
                    opacity: { value: 0.3 }
                }
            }
        },
        {
            type: 'rect',
            from: {
                data: DATASET_DEFAULT_NAME
            },
            encode: {
                enter: {
                    tooltip: {
                        signal: `{'__${DATASET_DEFAULT_NAME}.0__': datum['__${DATASET_DEFAULT_NAME}.0__'], '__${DATASET_DEFAULT_NAME}.1__': datum['__${DATASET_DEFAULT_NAME}.1__']}`
                    },
                    x: {
                        scale: 'xscale',
                        field: `__${DATASET_DEFAULT_NAME}.1____highlight`
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
                    },
                    opacity: [
                        {
                            test: `datum.${SELECTED_ROW_FIELD_NAME} == 'off'`,
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
        datasets: { [DATASET_DEFAULT_NAME]: dataset },
        interactivity: {
            tooltip: true,
            contextMenu: true,
            highlight: true,
            selection: true,
            dataPointLimit: INTERACTIVITY_DEFAULTS.selectionMaxDataPoints
        },
        config: getDenebTemplateVegaSpecificConfig()
    }
});
