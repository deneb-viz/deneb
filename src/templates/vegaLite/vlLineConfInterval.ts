import { IVegaLiteTemplate } from '../../types';
import { autoSizeConfigSimple, vegaDataModelRef } from '..';

export const vlLineConfInterval: IVegaLiteTemplate = {
    name: 'Line Chart with Interval Band',
    description:
        'A multiple layer visual that displays a line, along with a band spanning two additional measures.',
    spec: {
        data: vegaDataModelRef(),
        encoding: {
            x: {
                field: '$xAxis$',
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
                        field: '$maxValue$',
                        type: 'quantitative'
                    },
                    y2: {
                        field: '$minValue$'
                    }
                }
            },
            {
                mark: {
                    type: 'line'
                },
                encoding: {
                    y: {
                        field: '$refValue$',
                        type: 'quantitative'
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
