import type { SectionSchema } from './schema-types';

/**
 * Schema for the Performance accordion item. Currently exposes the
 * incremental-update toggle and its row-count threshold.
 *
 * Note: the threshold row is only rendered when incremental updates are
 * enabled. Visibility of the control is a separate concern from schema
 * membership; the schema is the stable superset of rows the filter can
 * match against.
 */
export const performanceSchema = {
    id: 'performance',
    headingKey: 'Text_Vega_Performance',
    rows: [
        {
            id: 'incremental-updates',
            labelKey: 'Text_Vega_Performance_IncrementalUpdates',
            assistiveKey: 'Assistive_Text_Performance'
        },
        {
            id: 'incremental-threshold',
            labelKey: 'Text_Vega_Performance_Threshold'
        }
    ]
} as const satisfies SectionSchema;
