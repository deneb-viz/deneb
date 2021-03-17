import { IVegaTemplate } from '../../types';
import { autoSizeConfigSimple, vegaDataModelRef } from '..';

export const vBarSimple: IVegaTemplate = {
    name: 'Simple Bar Chart',
    description:
        'A simple, single-view bar chart, with a column on the Y-Axis and a measure on the X-Axis.',
    spec: {
        data: [vegaDataModelRef()],
        scales: [
            {
                name: 'yscale',
                type: 'band',
                domain: {
                    data: 'dataset',
                    field: '$yAxis$'
                },
                range: 'height',
                padding: 0.1,
                round: true
            },
            {
                name: 'xscale',
                domain: {
                    data: 'dataset',
                    field: '$xAxis$'
                },
                nice: true,
                range: 'width'
            }
        ],
        axes: [
            {
                scale: 'xscale',
                orient: 'bottom',
                title: '$xAxis$'
            },
            {
                orient: 'left',
                scale: 'yscale',
                title: '$yAxis$'
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
                            field: '$xAxis$'
                        },
                        x2: {
                            scale: 'xscale',
                            value: 0
                        },
                        y: {
                            scale: 'yscale',
                            field: '$yAxis$'
                        },
                        height: {
                            scale: 'yscale',
                            band: 1
                        }
                    }
                }
            }
        ]
    },
    config: {
        autosize: autoSizeConfigSimple()
    },
    placeholders: [
        {
            key: '$yAxis$',
            displayName: 'Category',
            description:
                "Select a column that will be displayed on the chart's Y-Axis",
            allowTypes: ['text'],
            allowKind: 0
        },
        {
            key: '$xAxis$',
            displayName: 'Measure',
            description:
                "Select a measure that will be displayed on the chart's X-Axis",
            allowTypes: ['numeric', 'integer'],
            allowKind: 1
        }
    ]
};
