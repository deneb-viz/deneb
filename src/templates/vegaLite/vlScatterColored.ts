import { IVegaLiteTemplate } from '../../types';
import { autoSizeConfigSimple, vegaDataModelRef } from '..';

export const vlScatterColored: IVegaLiteTemplate = {
    name: 'Colored Scatterplot',
    description:
        "A scatterplot, using numeric columns for X and Y axis values, and another column to categorize into color. If you're using a measure for an axis, ensure that you've added a column to produce a suitable row context.",
    spec: {
        data: vegaDataModelRef(),
        mark: {
            type: 'point'
        },
        encoding: {
            x: {
                field: '$xAxis$',
                type: 'quantitative'
            },
            y: {
                field: '$yAxis$',
                type: 'quantitative'
            },
            color: {
                field: '$series$',
                type: 'nominal'
            }
        }
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
