import type { SectionSchema } from './schema-types';

/**
 * Schema for the General accordion item. A single settings accordion
 * wraps three sub-components (Provider, RenderMode, ScaleToZoom) — each
 * contributes one row to this schema.
 */
export const generalSchema = {
    id: 'general',
    headingKey: 'Text_Vega_Provider_And_Rendering',
    rows: [
        {
            id: 'provider',
            labelKey: 'Text_Vega_Provider',
            assistiveKey: 'Assistive_Text_Provider'
        },
        {
            id: 'render-mode',
            labelKey: 'Text_Vega_RenderMode',
            assistiveKey: 'Assistive_Text_RenderMode'
        },
        {
            id: 'scale-to-zoom',
            labelKey: 'Text_Setting_ScaleToZoom',
            assistiveKey: 'Assistive_Text_ScaleToZoom'
        }
    ]
} as const satisfies SectionSchema;
