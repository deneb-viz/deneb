import { TopLevelSpec } from 'vega-lite';
import {
    authorInfo,
    autoSizeConfigSimple,
    vegaDataModelRef,
    vegaLiteProviderInfo
} from '..';
import { getConfig } from '../../core/utils/config';

export const vlBarSimple: TopLevelSpec = {
    $schema: vegaLiteProviderInfo,
    data: vegaDataModelRef(),
    config: {
        autosize: autoSizeConfigSimple()
    },
    mark: {
        type: 'bar',
        tooltip: true
    },
    encoding: {
        y: {
            field: '__0__',
            type: 'nominal'
        },
        x: {
            field: '__1__',
            type: 'quantitative'
        },
        opacity: {
            condition: {
                test: {
                    field: '__selected__',
                    equal: 'off'
                },
                value: 0.3
            },
            value: 1
        }
    },
    usermeta: {
        information: {
            name: 'Simple Bar Chart',
            description:
                'A simple, single-view bar chart, with a column on the Y-Axis and a measure on the X-Axis. Also enabled for tooltips and cross-filtering.',
            author: authorInfo,
            uuid: 'ca5fe45d-6b40-4638-baf8-e6c33fdf1d59',
            generated: '2021-03-26T00:00:00.000Z'
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
            selection: true,
            dataPointLimit:
                getConfig().propertyDefaults.vega.selectionMaxDataPoints
        }
    }
};
