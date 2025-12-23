import { Config as VgConfig } from 'vega';
import { Config as VlConfig } from 'vega-lite';
import { interpolateRgbBasis } from 'd3-interpolate';

import type { CustomScheme } from './types';
import {
    POWERBI_THEME_DEFAULT,
    type PowerBiColorPalette,
    type PowerBIColorPaletteExtension
} from '@deneb-viz/powerbi-compat/theme';
import {
    POWERBI_THEME_FONT_LARGE_PX,
    POWERBI_THEME_FONT_MEDIUM_PX,
    POWERBI_THEME_FONT_SMALL_PX,
    POWERBI_THEME_FONT_STANDARD,
    POWERBI_THEME_FONT_TITLE,
    VEGA_SCHEME_POWERBI_CATEGORICAL,
    VEGA_SCHEME_POWERBI_DIVERGENT,
    VEGA_SCHEME_POWERBI_LINEAR,
    VEGA_SCHEME_POWERBI_ORDINAL
} from './constants';

type Config = VgConfig | VlConfig;

let _colorPalette: PowerBiColorPalette = POWERBI_THEME_DEFAULT;

/**
 * Fallback color if we don't have anything (we should, but it'll help us to diagnose).
 */
const DEFAULT_COLOR = '#000000';

export const registerCurrentPalette = (
    colorPalette: PowerBiColorPalette
): PowerBiColorPalette => {
    _colorPalette = colorPalette;
    return _colorPalette;
};

/**
 * Get the extended Power BI color schemes. If not in Power BI, we fall back to a default that ensures we aren't
 * restricted to non-Power BI environments if the visual host does not provide a color palette.
 */
export const getVegaSchemesPowerBi = (): CustomScheme[] => [
    {
        name: VEGA_SCHEME_POWERBI_CATEGORICAL,
        values: getCategoricalPalette()
    },
    {
        name: VEGA_SCHEME_POWERBI_ORDINAL,
        values: getLinearPalette()
    },
    {
        name: VEGA_SCHEME_POWERBI_LINEAR,
        values: getLinearPalette()
    },
    {
        name: VEGA_SCHEME_POWERBI_DIVERGENT,
        values: getDivergentPalette()
    }
];

/**
 * Pre-defined theme that can work with Power BI, based on our work to add this to vega-themes.
 * This version is dynamic, based on the underlying report theme (if feature enabled).
 */
export const getPowerBiThemeBase = (): Config => ({
    view: { stroke: 'transparent' },
    font: POWERBI_THEME_FONT_STANDARD,
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
        font: POWERBI_THEME_FONT_STANDARD,
        fontSize: POWERBI_THEME_FONT_SMALL_PX,
        fill: getThemeSecondLevelElement()
    },
    axis: {
        ticks: false,
        grid: false,
        domain: false,
        labelColor: getThemeSecondLevelElement(),
        labelFontSize: POWERBI_THEME_FONT_SMALL_PX,
        titleFont: POWERBI_THEME_FONT_TITLE,
        titleColor: getThemeFirstLevelElement(),
        titleFontSize: POWERBI_THEME_FONT_LARGE_PX,
        titleFontWeight: 'normal'
    },
    axisQuantitative: {
        tickCount: 3,
        grid: true,
        gridColor: getThemeBackgroundNeutral(),
        gridDash: [1, 5],
        labelFlush: false
    },
    axisX: { labelPadding: 5 },
    axisY: { labelPadding: 10 },
    header: {
        titleFont: POWERBI_THEME_FONT_TITLE,
        titleFontSize: POWERBI_THEME_FONT_LARGE_PX,
        titleColor: getThemeFirstLevelElement(),
        labelFont: POWERBI_THEME_FONT_STANDARD,
        labelFontSize: POWERBI_THEME_FONT_MEDIUM_PX,
        labelColor: getThemeSecondLevelElement()
    },
    legend: {
        titleFont: POWERBI_THEME_FONT_STANDARD,
        titleFontWeight: 'bold',
        titleColor: getThemeSecondLevelElement(),
        labelFont: POWERBI_THEME_FONT_STANDARD,
        labelFontSize: POWERBI_THEME_FONT_MEDIUM_PX,
        labelColor: getThemeSecondLevelElement(),
        symbolType: 'circle',
        symbolSize: 75
    }
});

/**
 * Add Vega-specific theme overrides to the Power BI theme.
 */
export const getPowerBiThemeVega = () =>
    ({
        ...getPowerBiThemeBase(),
        ...{
            path: {},
            shape: {},
            symbol: { strokeWidth: 1.5, size: 50 }
        }
    }) as VgConfig;

/**
 * Return all discrete colors from the Power BI color palette.
 */
const getCategoricalPalette = () => _colorPalette.colors.map((c) => c.value);

/**
 * Calculate an interpolated divergent palette, based on the current theme's
 * minimum, middle, and maximum divergent colors.
 */
const getDivergentPalette = () =>
    interpolateRgbBasis([
        getThemeDivergentMin() ?? DEFAULT_COLOR,
        getThemeDivergentMed() ?? DEFAULT_COLOR,
        getThemeDivergentMax() ?? DEFAULT_COLOR
    ]);

/**
 * Calculate an interpolated divergent palette, based on the current theme's
 * minimum and maximum divergent colors.
 */
const getLinearPalette = () =>
    interpolateRgbBasis([
        getThemeDivergentMin() ?? DEFAULT_COLOR,
        getThemeDivergentMax() ?? DEFAULT_COLOR
    ]);

/**
 * Get neutral background color from the current theme.
 */
const getThemeBackgroundNeutral = () => _colorPalette.backgroundNeutral?.value;

/**
 * Get a divergent color from the Power BI color palette by name.
 */
const getThemeColor = (
    key: Exclude<keyof PowerBIColorPaletteExtension, 'colors'>
): string | undefined => _colorPalette[key]?.value;

/**
 * Get a theme color by index from the Power BI color palette.
 */
export const getThemeColorByIndex = (index: number) =>
    _colorPalette.colors[index]?.value ?? DEFAULT_COLOR;

/**
 * Get a theme color by name from the Power BI color palette.
 */
export const getThemeColorByName = (name: string) =>
    getNamedColors()[name as keyof ReturnType<typeof getNamedColors>];

/**
 * Named colors from the theme, that we register for use with `pbiColor`. In
 * most cases, just passing through the name will work, but we wrap this to
 * provide a layer where we can manage situations such as the typo for maximum
 * in the (unsupported) `host.colorPalette` object.
 */
export const getNamedColors = () => ({
    max: getThemeDivergentMax(),
    min: getThemeDivergentMin(),
    middle: getThemeDivergentMed(),
    negative: getThemeSentimentNegative(),
    bad: getThemeSentimentNegative(),
    positive: getThemeSentimentPositive(),
    good: getThemeSentimentPositive(),
    neutral: getThemeSentimentNeutral()
});

/**
 * Get minimum divergent color from the current theme.
 */
const getThemeDivergentMin = () => getThemeColor('minimum');

/**
 * Get middle divergent color from the current theme.
 */
const getThemeDivergentMed = () => getThemeColor('center');

/**
 * Get maximum divergent color from the current theme.
 * @privateRemarks There's a typo in the palette, so we check both spellings.
 */
const getThemeDivergentMax = () =>
    getThemeColor('maximium') ?? getThemeColor('maximum');

/**
 * Get primary foreground color from the current theme.
 */
const getThemeFirstLevelElement = () => _colorPalette.foreground.value;

/**
 * Get secondary foreground color from the current theme.
 */
const getThemeSecondLevelElement = () =>
    _colorPalette.foregroundNeutralSecondary.value;

/**
 * Get negative sentiment color from the current theme.
 */
const getThemeSentimentNegative = () => getThemeColor('negative');

/**
 * Get positive sentiment color from the current theme.
 */
const getThemeSentimentPositive = () => getThemeColor('positive');

/**
 * Get neutral sentiment color from the current theme.
 */
const getThemeSentimentNeutral = () => getThemeColor('neutral');
