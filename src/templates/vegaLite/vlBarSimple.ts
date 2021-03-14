import { IVegaLiteTemplate } from '../../types';
import { autoSizeConfigSimple, vegaDataModelRef } from '..';

export const vlBarSimple: IVegaLiteTemplate = {
    name: 'Simple Bar Chart',
    description:
        'A simple, single-view bar chart, with a column on the Y-Axis and a measure on the X-Axis.',
    spec: {
        data: vegaDataModelRef(),
        mark: {
            type: 'bar',
            tooltip: true
        },
        encoding: {
            y: {
                field: '$yAxis$',
                type: 'nominal'
            },
            x: {
                field: '$xAxis$',
                type: 'quantitative'
            }
        }
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
