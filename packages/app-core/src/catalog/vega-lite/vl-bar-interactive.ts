import { TopLevelSpec } from 'vega-lite';

import { VEGA_LITE_SCHEMA_URL } from '.';
import { getDenebTemplateDatasetRef, getNewIncludedTemplateMetadata } from '..';
import { INTERACTIVITY_DEFAULTS } from '@deneb-viz/powerbi-compat/interactivity';
import {
    SELECTED_ROW_FIELD_NAME,
    type UsermetaDatasetField
} from '@deneb-viz/data-core/field';

const dataset: UsermetaDatasetField[] = [
    {
        key: '__0__',
        name: 'Category',
        description:
            "Select a column that will be displayed on the chart's Y-Axis",
        type: 'text',
        kind: 'column'
    },
    {
        key: '__1__',
        name: 'Measure',
        description:
            "Select a measure that will be displayed on the chart's X-Axis",
        type: 'numeric',
        kind: 'measure'
    }
];

export const vlBarInteractive = (): TopLevelSpec => ({
    $schema: VEGA_LITE_SCHEMA_URL,
    data: getDenebTemplateDatasetRef(),
    layer: [
        {
            mark: {
                type: 'bar',
                opacity: 0.3,
                tooltip: true
            },
            encoding: {
                x: {
                    field: '__1__'
                }
            }
        },
        {
            mark: {
                type: 'bar',
                tooltip: true
            },
            encoding: {
                x: {
                    field: '__1____highlight'
                },
                opacity: {
                    condition: {
                        test: {
                            field: SELECTED_ROW_FIELD_NAME,
                            equal: 'off'
                        },
                        value: 0
                    },
                    value: 1
                }
            }
        }
    ],
    encoding: {
        y: {
            field: '__0__',
            type: 'nominal'
        },
        x: {
            type: 'quantitative',
            axis: { title: '__1__' }
        }
    },
    usermeta: {
        ...getNewIncludedTemplateMetadata(
            'vegaLite',
            'Interactive bar chart',
            'An evolution of the simple bar chart, with tooltips, cross-filtering and cross-highlighting, compatible with Power BI.',
            'vlBarInteractive'
        ),
        ...{
            dataset,
            interactivity: {
                tooltip: true,
                contextMenu: true,
                highlight: true,
                selection: true,
                dataPointLimit: INTERACTIVITY_DEFAULTS.selectionMaxDataPoints
            }
        }
    }
});
