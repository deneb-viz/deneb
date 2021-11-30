import { TopLevelSpec } from 'vega-lite';
import {
    authorInfo,
    autoSizeConfigSimple,
    vegaDataModelRef,
    vegaLiteProviderInfo
} from '..';
import thumbnail from '../thumbnail';

export const vlLineConfInterval: TopLevelSpec = {
    $schema: vegaLiteProviderInfo,
    data: vegaDataModelRef(),
    config: {
        autosize: autoSizeConfigSimple()
    },
    encoding: {
        x: {
            field: '__xAxis__',
            type: 'quantitative'
        }
    },
    layer: [
        {
            mark: {
                type: 'errorband'
            },
            encoding: {
                y: {
                    field: '__maxValue__',
                    type: 'quantitative'
                },
                y2: {
                    field: '__minValue__'
                }
            }
        },
        {
            mark: {
                type: 'line'
            },
            encoding: {
                y: {
                    field: '__refValue__',
                    type: 'quantitative'
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
            uuid: '5ddfa070-0806-478a-8cd3-c906fbc654a1',
            generated: '2021-03-26T00:00:00.000Z',
            previewImageBase64PNG: thumbnail.lineConfInterval
        },
        provider: 'vegaLite',
        dataset: [
            {
                key: '__xAxis__',
                name: 'X-Axis',
                description:
                    "Select a measure that will be displayed on the chart's X-Axis",
                type: 'numeric',
                kind: 'column'
            },
            {
                key: '__minValue__',
                name: 'Minimum Value',
                description:
                    'Select a measure that will represent the minimum value of the band.',
                type: 'numeric',
                kind: 'measure'
            },
            {
                key: '__refValue__',
                name: 'Reference Value',
                description:
                    'Select a measure that will represent the reference value, or main line on the chart.',
                type: 'numeric',
                kind: 'measure'
            },
            {
                key: '__maxValue__',
                name: 'Maximum Value',
                description:
                    'Select a measure that will represent the maximum value of the band.',
                type: 'numeric',
                kind: 'measure'
            }
        ]
    }
};
