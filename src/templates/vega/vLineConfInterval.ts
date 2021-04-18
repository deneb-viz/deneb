import { IVegaTemplate } from '../../types';
import { autoSizeConfigSimple, vegaDataModelRef } from '..';

export const vLineConfInterval: IVegaTemplate = {
    name: 'Line Chart with Interval Band',
    description:
        'A multiple layer visual that displays a line, along with a band spanning two additional measures.',
    spec: {
        data: [vegaDataModelRef()],
        scales: [
            {
                name: 'xscale',
                domain: {
                    data: 'dataset',
                    field: '$xAxis$'
                },
                range: 'width',
                nice: true
            },
            {
                name: 'yscale',
                domain: {
                    data: 'dataset',
                    field: '$maxValue$'
                },
                range: 'height',
                nice: true
            }
        ],
        axes: [
            {
                scale: 'xscale',
                orient: 'bottom',
                title: '$xAxis$'
            },
            {
                scale: 'yscale',
                orient: 'left',
                title: '$refValue$'
            }
        ],
        marks: [
            {
                name: 'interval-band',
                type: 'area',
                style: ['area', 'errorband-band'],
                sort: {
                    field: 'datum["$xAxis$"]'
                },
                from: {
                    data: 'dataset'
                },
                encode: {
                    update: {
                        opacity: {
                            value: 0.3
                        },
                        orient: {
                            value: 'vertical'
                        },
                        fill: {
                            value: '#4c78a8'
                        },
                        x: {
                            scale: 'xscale',
                            field: '$xAxis$'
                        },
                        y: {
                            scale: 'yscale',
                            field: '$minValue$'
                        },
                        y2: {
                            scale: 'yscale',
                            field: '$maxValue$'
                        }
                    }
                }
            },
            {
                name: 'reference-line',
                type: 'line',
                style: ['line'],
                sort: {
                    field: 'datum["$xAxis$"]'
                },
                from: {
                    data: 'dataset'
                },
                encode: {
                    update: {
                        tooltip: {
                            signal: 'datum'
                        },
                        stroke: {
                            value: '#4c78a8'
                        },
                        x: {
                            scale: 'xscale',
                            field: '$xAxis$'
                        },
                        y: {
                            scale: 'yscale',
                            field: '$refValue$'
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
            key: '$xAxis$',
            displayName: 'X-Axis',
            description:
                "Select a measure that will be displayed on the chart's X-Axis",
            allowTypes: ['numeric', 'integer', 'dateTime'],
            allowKind: 0
        },
        {
            key: '$minValue$',
            displayName: 'Minimum Value',
            description:
                'Select a measure that will represent the minimum value of the band.',
            allowTypes: ['numeric', 'integer'],
            allowKind: 1
        },
        {
            key: '$refValue$',
            displayName: 'Reference Value',
            description:
                'Select a measure that will represent the reference value, or main line on the chart.',
            allowTypes: ['numeric', 'integer'],
            allowKind: 1
        },
        {
            key: '$maxValue$',
            displayName: 'Maximum Value',
            description:
                'Select a measure that will represent the maximum value of the band.',
            allowTypes: ['numeric', 'integer'],
            allowKind: 1
        }
    ]
};
