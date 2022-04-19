import { Spec } from 'vega';
import { authorInfo, vegaDataModelRef, vegaProviderInfo } from '..';
import { DATASET_NAME } from '../../constants';
import thumbnail from '../thumbnail';

export const vLineConfInterval: Spec = {
    $schema: vegaProviderInfo,
    data: [vegaDataModelRef()],
    config: {},
    scales: [
        {
            name: 'xscale',
            domain: {
                data: DATASET_NAME,
                field: '__0__'
            },
            range: 'width',
            nice: true
        },
        {
            name: 'yscale',
            domain: {
                data: DATASET_NAME,
                field: '__3__'
            },
            range: 'height',
            nice: true
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
            title: '__2__'
        }
    ],
    marks: [
        {
            name: 'interval-band',
            type: 'area',
            style: ['area', 'errorband-band'],
            sort: {
                field: 'datum["__0__"]'
            },
            from: {
                data: DATASET_NAME
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
                        field: '__0__'
                    },
                    y: {
                        scale: 'yscale',
                        field: '__1__'
                    },
                    y2: {
                        scale: 'yscale',
                        field: '__3__'
                    }
                }
            }
        },
        {
            name: 'reference-line',
            type: 'line',
            style: ['line'],
            sort: {
                field: 'datum["__0__"]'
            },
            from: {
                data: DATASET_NAME
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
                        field: '__0__'
                    },
                    y: {
                        scale: 'yscale',
                        field: '__2__'
                    }
                }
            }
        }
    ],

    usermeta: {
        information: {
            name: 'Line Chart with Interval Band',
            description:
                'A multiple layer visual that displays a line, along with a band spanning two additional measures.',
            author: authorInfo,
            uuid: '5b8845ad-1bcd-4066-b1ff-c844903c02e1',
            generated: '2021-03-26T00:00:00.000Z',
            previewImageBase64PNG: thumbnail.lineConfInterval
        },
        provider: 'vega',
        dataset: [
            {
                key: '__0__',
                name: 'X-Axis',
                description:
                    "Select a measure that will be displayed on the chart's X-Axis",
                type: 'numeric',
                kind: 'column'
            },
            {
                key: '__1__',
                name: 'Minimum Value',
                description:
                    'Select a measure that will represent the minimum value of the band.',
                type: 'numeric',
                kind: 'measure'
            },
            {
                key: '__2__',
                name: 'Reference Value',
                description:
                    'Select a measure that will represent the reference value, or main line on the chart.',
                type: 'numeric',
                kind: 'measure'
            },
            {
                key: '__3__',
                name: 'Maximum Value',
                description:
                    'Select a measure that will represent the maximum value of the band.',
                type: 'numeric',
                kind: 'measure'
            }
        ]
    }
};
