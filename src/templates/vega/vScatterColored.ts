import { Spec } from 'vega';
import { authorInfo, autoSizeConfigSimple, vegaProviderInfo } from '..';

export const vScatterColored: Spec = {
    $schema: vegaProviderInfo,
    data: [
        {
            name: 'dataset',
            transform: [
                {
                    type: 'filter',
                    expr:
                        'isValid(datum["__xAxis__"]) && isFinite(+datum["__xAxis__"]) && isValid(datum["__yAxis__"]) && isFinite(+datum["__yAxis__"])'
                }
            ]
        }
    ],
    config: {
        autosize: autoSizeConfigSimple()
    },
    scales: [
        {
            name: 'xscale',
            domain: {
                data: 'dataset',
                field: '__xAxis__'
            },
            range: 'width',
            nice: true
        },
        {
            name: 'yscale',
            domain: {
                data: 'dataset',
                field: '__yAxis__'
            },
            range: 'height',
            nice: true
        },
        {
            name: 'color',
            type: 'ordinal',
            domain: {
                data: 'dataset',
                field: '__series__',
                sort: true
            },
            range: 'category'
        }
    ],
    axes: [
        {
            scale: 'xscale',
            orient: 'bottom',
            title: '__xAxis__'
        },
        {
            scale: 'yscale',
            orient: 'left',
            title: '__yAxis__'
        }
    ],
    marks: [
        {
            name: 'marks',
            type: 'symbol',
            style: ['point'],
            from: {
                data: 'dataset'
            },
            encode: {
                update: {
                    tooltip: {
                        signal: 'datum'
                    },
                    stroke: {
                        scale: 'color',
                        field: '__series__'
                    },
                    x: [
                        {
                            scale: 'xscale',
                            field: '__xAxis__'
                        }
                    ],
                    y: [
                        {
                            scale: 'yscale',
                            field: '__yAxis__'
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
            title: '__series__'
        }
    ],
    usermeta: {
        information: {
            name: 'Colored Scatterplot',
            description:
                "A scatterplot, using numeric columns for X and Y axis values, and another column to categorize into color. If you're using a measure for an axis, ensure that you've added a column to produce a suitable row context.",
            author: authorInfo,
            uuid: 'ee329042-a7b4-43c0-9d7d-0494d8965a21',
            generated: '2021-03-26T00:00:00.000Z'
        },
        provider: 'vega',
        dataset: [
            {
                key: '__xAxis__',
                name: 'X-Axis',
                description:
                    "Select a column or measure that will be used to position points along chart's X-Axis.",
                type: 'numeric',
                kind: 'any'
            },
            {
                key: '__yAxis__',
                name: 'Y-Axis',
                description:
                    "Select a column or measure that will be used to position points along chart's Y-Axis.",
                type: 'numeric',
                kind: 'any'
            },
            {
                key: '__series__',
                name: 'Series',
                description:
                    'Select a column that will be used to specify color for the points on the chart.',
                type: 'text',
                kind: 'column'
            }
        ]
    }
};
