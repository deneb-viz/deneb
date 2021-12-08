import { Spec } from 'vega';
import { authorInfo, vegaProviderInfo } from '..';
import thumbnail from '../thumbnail';

export const vScatterColored: Spec = {
    $schema: vegaProviderInfo,
    data: [
        {
            name: 'dataset',
            transform: [
                {
                    type: 'filter',
                    expr: 'isValid(datum["__0__"]) && isFinite(+datum["__0__"]) && isValid(datum["__1__"]) && isFinite(+datum["__1__"])'
                }
            ]
        }
    ],
    config: {},
    scales: [
        {
            name: 'xscale',
            domain: {
                data: 'dataset',
                field: '__0__'
            },
            range: 'width',
            nice: true
        },
        {
            name: 'yscale',
            domain: {
                data: 'dataset',
                field: '__1__'
            },
            range: 'height',
            nice: true
        },
        {
            name: 'color',
            type: 'ordinal',
            domain: {
                data: 'dataset',
                field: '__2__',
                sort: true
            },
            range: 'category'
        }
    ],
    axes: [
        {
            scale: 'xscale',
            orient: 'bottom',
            title: '__0__'
        },
        {
            scale: 'yscale',
            orient: 'left',
            title: '__1__'
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
                        field: '__2__'
                    },
                    x: [
                        {
                            scale: 'xscale',
                            field: '__0__'
                        }
                    ],
                    y: [
                        {
                            scale: 'yscale',
                            field: '__1__'
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
            title: '__2__'
        }
    ],
    usermeta: {
        information: {
            name: 'Colored Scatterplot',
            description:
                "A scatterplot, using numeric columns for X and Y axis values, and another column to categorize into color. If you're using a measure for an axis, ensure that you've added a column to produce a suitable row context.",
            author: authorInfo,
            uuid: 'ee329042-a7b4-43c0-9d7d-0494d8965a21',
            generated: '2021-03-26T00:00:00.000Z',
            previewImageBase64PNG: thumbnail.scatterColored
        },
        provider: 'vega',
        dataset: [
            {
                key: '__0__',
                name: 'X-Axis',
                description:
                    "Select a column or measure that will be used to position points along chart's X-Axis.",
                type: 'numeric',
                kind: 'any'
            },
            {
                key: '__1__',
                name: 'Y-Axis',
                description:
                    "Select a column or measure that will be used to position points along chart's Y-Axis.",
                type: 'numeric',
                kind: 'any'
            },
            {
                key: '__2__',
                name: 'Series',
                description:
                    'Select a column that will be used to specify color for the points on the chart.',
                type: 'text',
                kind: 'column'
            }
        ]
    }
};
