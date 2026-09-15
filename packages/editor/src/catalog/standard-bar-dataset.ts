import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import { type UsermetaDatasetField } from '@deneb-viz/data-core/field';

/**
 * The standard two-field "category + measure" dataset shared by the included bar
 * chart templates (Vega and Vega-Lite, simple and interactive). Interactive
 * variants additionally enable the highlight support field on the measure, which
 * drives the cross-highlight layer.
 *
 * Kept as a leaf module (imports only data-core) so the template files can call
 * it at module-init without a circular dependency through the catalog barrel.
 */
export const getStandardBarDataset = (
    options: { interactive?: boolean } = {}
): UsermetaDatasetField[] => [
    {
        key: `__${DATASET_DEFAULT_NAME}.0__`,
        name: 'Category',
        description:
            "Select a column that will be displayed on the chart's Y-Axis",
        type: 'text',
        kind: 'column'
    },
    {
        key: `__${DATASET_DEFAULT_NAME}.1__`,
        name: 'Measure',
        description:
            "Select a measure that will be displayed on the chart's X-Axis",
        type: 'numeric',
        kind: 'measure',
        ...(options.interactive
            ? {
                  supportFieldConfiguration: {
                      highlight: true,
                      highlightStatus: false,
                      highlightComparator: false,
                      format: false,
                      formatted: false
                  }
              }
            : {})
    }
];
