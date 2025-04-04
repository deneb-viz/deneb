import { Config as VgConfig } from 'vega';
import { Config as VlConfig } from 'vega-lite';
import { interpolateHcl, interpolateRgbBasis, quantize } from 'd3-interpolate';

import { ptToPx } from '../../../core/ui/dom';
import { getVisualHost } from '../../visual-host';

type Config = VgConfig | VlConfig;

const FONT_SMALL_PX = ptToPx(9);
const LEGEND_FONT_PX = ptToPx(10);
const FONT_LARGE_PX = ptToPx(12);
const FONT_STANDARD = 'Segoe UI';
const FONT_TITLE = 'din';

/**
 * Pre-defined theme that can work with Power BI, based on our work to add this to vega-themes.
 * This version is dynamic, based on the underlying report theme (if feature enabled).
 */
export const powerbiTheme = (): Config => ({
    view: { stroke: 'transparent' },
    font: FONT_STANDARD,
    arc: {},
    area: { line: true, opacity: 0.6 },
    bar: {},
    line: {
        strokeWidth: 3,
        strokeCap: 'round',
        strokeJoin: 'round'
    },
    point: { filled: true, size: 75 },
    rect: {},

    text: {
        font: FONT_STANDARD,
        fontSize: FONT_SMALL_PX,
        fill: themeSecondLevelElement()
    },
    axis: {
        ticks: false,
        grid: false,
        domain: false,
        labelColor: themeSecondLevelElement(),
        labelFontSize: FONT_SMALL_PX,
        titleFont: FONT_TITLE,
        titleColor: themeFirstLevelElement(),
        titleFontSize: FONT_LARGE_PX,
        titleFontWeight: 'normal'
    },
    axisQuantitative: {
        tickCount: 3,
        grid: true,
        gridColor: themeBackgroundNeutral(),
        gridDash: [1, 5],
        labelFlush: false
    },
    axisX: { labelPadding: 5 },
    axisY: { labelPadding: 10 },
    header: {
        titleFont: FONT_TITLE,
        titleFontSize: FONT_LARGE_PX,
        titleColor: themeFirstLevelElement(),
        labelFont: FONT_STANDARD,
        labelFontSize: LEGEND_FONT_PX,
        labelColor: themeSecondLevelElement()
    },
    legend: {
        titleFont: FONT_STANDARD,
        titleFontWeight: 'bold',
        titleColor: themeSecondLevelElement(),
        labelFont: FONT_STANDARD,
        labelFontSize: LEGEND_FONT_PX,
        labelColor: themeSecondLevelElement(),
        symbolType: 'circle',
        symbolSize: 75
    }
});

/**
 * Add Vega-specific theme overrides to the Power BI theme.
 */
export const powerBiThemeVega = () =>
    ({
        ...powerbiTheme(),
        ...{
            path: {},
            shape: {},
            symbol: { strokeWidth: 1.5, size: 50 }
        }
    } as VgConfig);

/**
 * Helper function to extract palette color by (zero-based) index.
 */
export const getThemeColorByIndex = (index: number) =>
    getVisualHost()?.colorPalette?.['colors']?.[index]?.value;

/**
 * Helper function to extract palette color by object name.
 */
export const getThemeColorByName = (name: string) => namedColors()[name];

/**
 * Retrieve all current theme color values from the visual host.
 */
export const powerBiColors = () =>
    getVisualHost()?.colorPalette?.['colors']?.map((c: any) => c.value) || [];

/**
 * Calculate an interpolated divergent palette, based on the current theme's
 * minimum and maximum divergent colors.
 */
export const divergentPalette = () =>
    interpolateRgbBasis([themeDivergentMin(), themeDivergentMax()]);

/**
 * Calculate an interpolated divergent palette, based on the current theme's
 * minimum, middle, and maximum divergent colors.
 */
export const divergentPaletteMed = () =>
    interpolateRgbBasis([
        themeDivergentMin(),
        themeDivergentMed(),
        themeDivergentMax()
    ]);

/**
 * Calculate an ordinal palette, based on the defined number of available
 * categories. This will interpolate between the theme's minimum and maximum
 * divergent colors.
 */
export const ordinalPalette = (ordinalColorCount: number) => {
    if (ordinalColorCount === 1) return [themeDivergentMax()];
    return quantize(
        interpolateHcl(themeDivergentMin(), themeDivergentMax()),
        ordinalColorCount
    );
};

/**
 * Get neutral background color from the current theme.
 */
const themeBackgroundNeutral = () =>
    getVisualHost()?.colorPalette?.backgroundNeutral?.value;

/**
 * Get primary foreground color from the current theme.
 */
const themeFirstLevelElement = () =>
    getVisualHost()?.colorPalette?.foreground?.value;

/**
 * Get secondary foreground color from the current theme.
 */
const themeSecondLevelElement = () =>
    getVisualHost()?.colorPalette?.foregroundNeutralSecondary?.value;

/**
 * Get minimum divergent color from the current theme.
 */
const themeDivergentMin = () =>
    <string>getVisualHost()?.colorPalette?.['minimum']?.value;

/**
 * Get middle divergent color from the current theme.
 */
const themeDivergentMed = () =>
    <string>getVisualHost()?.colorPalette?.['center']?.value;

/**
 * Get maximum divergent color from the current theme.
 * @privateRemarks There's a typo in the palette, so  we cast the correct
 * spelling in case they ever fix it.
 */
const themeDivergentMax = () =>
    <string>(
        (getVisualHost()?.colorPalette?.['maximium']?.value ??
            getVisualHost()?.colorPalette?.['maximum']?.value)
    );

/**
 * Get negative sentiment color from the current theme.
 */
const themeSentimentNegative = () =>
    <string>getVisualHost()?.colorPalette?.['negative']?.value;

/**
 * Get positive sentiment color from the current theme.
 */
const themeSentimentPositive = () =>
    <string>getVisualHost()?.colorPalette?.['positive']?.value;

/**
 * Get neutral sentiment color from the current theme.
 */
const themeSentimentNeutral = () =>
    <string>getVisualHost()?.colorPalette?.['neutral']?.value;

/**
 * Named colors from the theme, that we register for use with `pbiColor`. In
 * most cases, just passing through the name will work, but we wrap this to
 * provide a layer where we can manage situations such as the typo for maximum
 * in the (unsupported) `host.colorPalette` object.
 */
export const namedColors = () => ({
    max: themeDivergentMax(),
    min: themeDivergentMin(),
    middle: themeDivergentMed(),
    negative: themeSentimentNegative(),
    bad: themeSentimentNegative(),
    positive: themeSentimentPositive(),
    good: themeSentimentPositive(),
    neutral: themeSentimentNeutral()
});
