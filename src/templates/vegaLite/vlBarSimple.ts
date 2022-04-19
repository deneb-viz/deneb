import { TopLevelSpec } from 'vega-lite';
import { authorInfo, vegaDataModelRef, vegaLiteProviderInfo } from '..';
import { DATASET_SELECTED_NAME } from '../../core/constants';
import { getConfig } from '../../core/utils/config';
import thumbnail from '../thumbnail';

export const vlBarSimple: TopLevelSpec = {
    $schema: vegaLiteProviderInfo,
    data: vegaDataModelRef(),
    config: {},
    layer: [
        {
            mark: {
                type: 'bar',
                opacity: 0.3,
                tooltip: true
            },
            encoding: {
                x: {
                    field: '__1__'
                }
            }
        },
        {
            mark: {
                type: 'bar',
                tooltip: true
            },
            encoding: {
                x: {
                    field: '__1____highlight'
                },
                opacity: {
                    condition: {
                        test: {
                            field: DATASET_SELECTED_NAME,
                            equal: 'off'
                        },
                        value: 0
                    },
                    value: 1
                }
            }
        }
    ],
    encoding: {
        y: {
            field: '__0__',
            type: 'nominal'
        },
        x: {
            type: 'quantitative',
            axis: { title: '__1__' }
        }
    },
    usermeta: {
        information: {
            name: 'Simple Bar Chart',
            description:
                'A simple, single-view bar chart, with a column on the Y-Axis and a measure on the X-Axis. Also enabled for tooltips, cross-filtering and cross-highlight.',
            author: authorInfo,
            uuid: 'ca5fe45d-6b40-4638-baf8-e6c33fdf1d59',
            generated: '2021-03-26T00:00:00.000Z',
            previewImageBase64PNG: thumbnail.barSimple
        },
        provider: 'vegaLite',
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
