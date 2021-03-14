import { IVegaTemplate } from '../../types';
import { autoSizeConfigSimple } from '..';

export const vScatterColored: IVegaTemplate = {
    name: 'Colored Scatterplot',
    description:
        "A scatterplot, using numeric columns for X and Y axis values, and another column to categorize into color. If you're using a measure for an axis, ensure that you've added a column to produce a suitable row context.",
    spec: {
        data: [
            {
                name: 'values',
                transform: [
                    {
                        type: 'filter',
                        expr:
                            'isValid(datum["$xAxis$"]) && isFinite(+datum["$xAxis$"]) && isValid(datum["$yAxis$"]) && isFinite(+datum["$yAxis$"])'
                    }
                ]
            }
        ],
        scales: [
            {
                name: 'xscale',
                domain: {
                    data: 'values',
                    field: '$xAxis$'
                },
                range: 'width',
                nice: true
            },
            {
                name: 'yscale',
                domain: {
                    data: 'values',
                    field: '$yAxis$'
                },
                range: 'height',
                nice: true
            },
            {
                name: 'color',
                type: 'ordinal',
                domain: {
                    data: 'values',
                    field: '$series$',
                    sort: true
                },
                range: 'category'
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
                title: '$yAxis$'
            }
        ],
        marks: [
            {
                name: 'marks',
                type: 'symbol',
                style: ['point'],
                from: {
                    data: 'values'
                },
                encode: {
                    update: {
                        tooltip: {
                            signal: 'datum'
                        },
                        stroke: {
                            scale: 'color',
                            field: '$series$'
                        },
                        x: [
                            {
                                scale: 'xscale',
                                field: '$xAxis$'
                            }
                        ],
                        y: [
                            {
                                scale: 'yscale',
                                field: '$yAxis$'
                            }
                        ]
                    }
                }
            }
        ],
        legends: [
            {
                stroke: 'color',
                symbolType: 'circle',
                title: '$series$'
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
                "Select a column or measure that will be used to position points along chart's X-Axis.",
            allowTypes: ['numeric', 'integer'],
            allowKind: 2
        },
        {
            key: '$yAxis$',
            displayName: 'Y-Axis',
            description:
                "Select a column or measure that will be used to position points along chart's Y-Axis.",
            allowTypes: ['numeric', 'integer'],
            allowKind: 2
        },
        {
            key: '$series$',
            displayName: 'Series',
            description:
                'Select a column that will be used to specify color for the points on the chart.',
            allowTypes: ['text'],
            allowKind: 0
        }
    ]
};
