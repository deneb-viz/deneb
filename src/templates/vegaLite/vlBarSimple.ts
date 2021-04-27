import { TopLevelSpec } from 'vega-lite';
import {
    authorInfo,
    autoSizeConfigSimple,
    vegaDataModelRef,
    vegaLiteProviderInfo
} from '..';

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
            field: '__yAxis__',
            type: 'nominal'
        },
        x: {
            field: '__xAxis__',
            type: 'quantitative'
        }
    },
    usermeta: {
        information: {
            name: 'Simple Bar Chart',
            description:
                'A simple, single-view bar chart, with a column on the Y-Axis and a measure on the X-Axis.',
            author: authorInfo,
            uuid: 'ca5fe45d-6b40-4638-baf8-e6c33fdf1d59',
            generated: '2021-03-26T00:00:00.000Z'
        },
        provider: 'vegaLite',
        dataset: [
            {
                key: '__yAxis__',
                name: 'Category',
                description:
                    "Select a column that will be displayed on the chart's Y-Axis",
                type: 'text',
                kind: 'column'
            },
            {
                key: '__xAxis__',
                name: 'Measure',
                description:
                    "Select a measure that will be displayed on the chart's X-Axis",
                type: 'numeric',
                kind: 'measure'
            }
        ]
    }
};
