import { ptToPx } from '@deneb-viz/utils/dom';

export const POWERBI_THEME_FONT_SMALL_PX = ptToPx(9);
export const POWERBI_THEME_FONT_MEDIUM_PX = ptToPx(10);
export const POWERBI_THEME_FONT_LARGE_PX = ptToPx(12);
export const POWERBI_THEME_FONT_STANDARD =
    'Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif';
export const POWERBI_THEME_FONT_TITLE =
    'din, wf_standard-font, helvetica, arial, sans-serif';

/**
 * Divergent color scheme from Power BI to Vega view.
 */
export const VEGA_SCHEME_POWERBI_DIVERGENT = 'pbiColorDivergent';

/**
 * Ordinal color scheme from Power BI to Vega view.
 */
export const VEGA_SCHEME_POWERBI_ORDINAL = 'pbiColorOrdinal';

/**
 * Linear color scheme from Power BI to Vega view.
 */
export const VEGA_SCHEME_POWERBI_LINEAR = 'pbiColorLinear';

/**
 * Nominal color scheme from Power BI to Vega view.
 */
export const VEGA_SCHEME_POWERBI_CATEGORICAL = 'pbiColorNominal';

/**
 * We want to extend the Vega-Lite schema with our custom schemes, so that they do not return warnings. This method
 * provides the extended names by type so they can be patched when we build it.
 */
export const VEGA_LITE_SCHEME_ADDITIONS = {
    categorical: [
        VEGA_SCHEME_POWERBI_CATEGORICAL,
        VEGA_SCHEME_POWERBI_LINEAR,
        VEGA_SCHEME_POWERBI_ORDINAL
    ],
    diverging: [VEGA_SCHEME_POWERBI_DIVERGENT],
    sequential: [VEGA_SCHEME_POWERBI_LINEAR]
};
