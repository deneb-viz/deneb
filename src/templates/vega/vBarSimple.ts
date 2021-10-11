import { Spec } from 'vega';
import {
    authorInfo,
    autoSizeConfigSimple,
    vegaDataModelRef,
    vegaProviderInfo
} from '..';
import { getConfig } from '../../core/utils/config';

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
                field: '__1__'
            },
            range: 'height',
            padding: 0.1,
            round: true
        },
        {
            name: 'xscale',
            domain: {
                data: 'dataset',
                field: '__0__'
            },
            nice: true,
            range: 'width'
        }
    ],
    axes: [
        {
            scale: 'xscale',
            orient: 'bottom',
            title: '__0__'
        },
        {
            orient: 'left',
            scale: 'yscale',
            title: '__1__'
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
                        field: '__0__'
                    },
                    x2: {
                        scale: 'xscale',
                        value: 0
                    },
                    y: {
                        scale: 'yscale',
                        field: '__1__'
                    },
                    height: {
                        scale: 'yscale',
                        band: 1
                    },
                    opacity: [
                        {
                            test: "datum.__selected__ == 'off'",
                            value: 0.3
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
                'A simple, single-view bar chart, with a column on the Y-Axis and a measure on the X-Axis. Also enabled for tooltips and cross-filtering.',
            author: authorInfo,
            uuid: '47577168-2e0c-42de-8e27-cb33071fae43',
            generated: '2021-03-26T00:00:00.000Z'
        },
        provider: 'vega',
        dataset: [
            {
                key: '__1__',
                name: 'Category',
                description:
                    "Select a column that will be displayed on the chart's Y-Axis",
                type: 'text',
                kind: 'column'
            },
            {
                key: '__0__',
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
