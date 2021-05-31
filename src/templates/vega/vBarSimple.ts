import { Spec } from 'vega';
import {
    authorInfo,
    autoSizeConfigSimple,
    vegaDataModelRef,
    vegaProviderInfo
} from '..';

export const vBarSimple: Spec = {
    $schema: vegaProviderInfo,
    data: [vegaDataModelRef()],
    config: {
        autosize: autoSizeConfigSimple()
    },
    scales: [
        {
            name: 'yscale',
            type: 'band',
            domain: {
                data: 'dataset',
                field: '__yAxis__'
            },
            range: 'height',
            padding: 0.1,
            round: true
        },
        {
            name: 'xscale',
            domain: {
                data: 'dataset',
                field: '__xAxis__'
            },
            nice: true,
            range: 'width'
        }
    ],
    axes: [
        {
            scale: 'xscale',
            orient: 'bottom',
            title: '__xAxis__'
        },
        {
            orient: 'left',
            scale: 'yscale',
            title: '__yAxis__'
        }
    ],
    marks: [
        {
            type: 'rect',
            from: {
                data: 'dataset'
            },
            encode: {
                enter: {
                    tooltip: {
                        signal: 'datum'
                    },
                    x: {
                        scale: 'xscale',
                        field: '__xAxis__'
                    },
                    x2: {
                        scale: 'xscale',
                        value: 0
                    },
                    y: {
                        scale: 'yscale',
                        field: '__yAxis__'
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
        information: {
            name: 'Simple Bar Chart',
            description:
                'A simple, single-view bar chart, with a column on the Y-Axis and a measure on the X-Axis.',
            author: authorInfo,
            uuid: '47577168-2e0c-42de-8e27-cb33071fae43',
            generated: '2021-03-26T00:00:00.000Z'
        },
        provider: 'vega',

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
