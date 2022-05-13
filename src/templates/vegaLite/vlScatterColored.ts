import { TopLevelSpec } from 'vega-lite';
import { authorInfo, vegaDataModelRef, vegaLiteProviderInfo } from '../common';
import { getCombinedBase64ImageWithMime } from '../../features/template';
import thumbnail from '../thumbnail';

export const vlScatterColored: TopLevelSpec = {
    $schema: vegaLiteProviderInfo,
    data: vegaDataModelRef(),
    config: {},
    mark: {
        type: 'point'
    },
    encoding: {
        x: {
            field: '__0__',
            type: 'quantitative'
        },
        y: {
            field: '__1__',
            type: 'quantitative'
        },
        color: {
            field: '__2__',
            type: 'nominal',
            scale: { scheme: 'pbiColorNominal' }
        }
    },
    usermeta: {
        information: {
            name: 'Colored Scatterplot',
            description:
                "A scatterplot, using numeric columns for X and Y axis values, and another column to categorize into color. If you're using a measure for an axis, ensure that you've added a column to produce a suitable row context.",
            author: authorInfo,
            uuid: 'a3392ab4-6cb4-4dae-81ed-62de931cf9b7',
            generated: '2021-03-26T00:00:00.000Z',
            previewImageBase64PNG: getCombinedBase64ImageWithMime(
                thumbnail.scatterColored
            )
        },
        provider: 'vegaLite',
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
