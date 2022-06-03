import { Config, Spec } from 'vega';
import {
    authorInfo,
    getVegaTemplateSpecificConfig,
    vegaDataModelRef,
    vegaProviderInfo
} from '../common';
import thumbnail from '../thumbnail';
import { getConfig } from '../../core/utils/config';
import { DATASET_NAME, DATASET_SELECTED_NAME } from '../../constants';
import { getCombinedBase64ImageWithMime } from '../../features/template';

export const vBarSimple: Spec = {
    $schema: vegaProviderInfo,
    data: [vegaDataModelRef()],
    config: getVegaTemplateSpecificConfig(),
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
            title: '__1__'
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
                        signal: 'datum'
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
                        signal: 'datum'
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
        information: {
            name: 'Simple Bar Chart',
            description:
                'A simple, single-view bar chart, with a column on the Y-Axis and a measure on the X-Axis. Also enabled for tooltips, cross-filtering and cross-highlight.',
            author: authorInfo,
            uuid: '47577168-2e0c-42de-8e27-cb33071fae43',
            generated: '2021-03-26T00:00:00.000Z',
            previewImageBase64PNG: getCombinedBase64ImageWithMime(
                thumbnail.barSimple
            )
        },
        provider: 'vega',
        dataset: [
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
        ],
        interactivity: {
            tooltip: true,
            contextMenu: true,
            highlight: true,
            selection: true,
            dataPointLimit:
                getConfig().propertyDefaults.vega.selectionMaxDataPoints
        }
    }
};
