import { Config as VgConfig, Spec } from 'vega';
import { Config as VlConfig, TopLevelSpec } from 'vega-lite';
import merge from 'lodash/merge';
import range from 'lodash/range';

import { hostServices } from '../services';
import { ptToPx } from '../ui/dom';

type Config = VgConfig | VlConfig;

const fontSmallPx = ptToPx(9);
const legendFontPx = ptToPx(10);
const fontLargePx = ptToPx(12);
const fontStandard = 'Segoe UI';
const fontTitle = 'wf_standard-font, helvetica, arial, sans-serif';
const ordinalRangeQty = 10;

/**
 * Pre-defined theme that can work with Power BI, based on our work to add this to vega-themes.
 * This version is dynamic, based on the underlying report theme (if feature enabled).
 */
export const powerbiTheme = (): Config => ({
    autosize: {
        type: 'fit',
        contains: 'padding'
    },
    view: { stroke: 'transparent' },
    font: fontStandard,
    arc: {},
    area: { line: true, opacity: 0.6 },
    line: {
        strokeWidth: 3,
        strokeCap: 'round',
        strokeJoin: 'round'
    },
    path: {},
    point: { filled: true, size: 75 },
    rect: {},
    shape: {},
    symbol: { strokeWidth: 1.5, size: 50 },
    text: {
        font: fontStandard,
        fontSize: fontSmallPx,
        fill: themeSecondLevelElement()
    },
    axis: {
        ticks: false,
        grid: false,
        domain: false,
        labelColor: themeSecondLevelElement(),
        labelFontSize: fontSmallPx,
        titleFont: fontTitle,
        titleColor: themeFirstLevelElement(),
        titleFontSize: fontLargePx,
        titleFontWeight: 'normal'
    },
    axisQuantitative: {
        tickCount: 3,
        grid: true,
        gridColor: themeBackgroundNeutral(),
        gridDash: [1, 5],
        labelFlush: false
    },
    axisBand: { tickExtra: true },
    axisX: { labelPadding: 5 },
    axisY: { labelPadding: 10 },
    header: {
        titleFont: fontTitle,
        titleFontSize: fontLargePx,
        titleColor: themeFirstLevelElement(),
        labelFont: fontStandard,
        labelFontSize: legendFontPx,
        labelColor: themeSecondLevelElement()
    },
    legend: {
        titleFont: fontStandard,
        titleFontWeight: 'bold',
        titleColor: themeSecondLevelElement(),
        labelFont: fontStandard,
        labelFontSize: legendFontPx,
        labelColor: themeSecondLevelElement(),
        symbolType: 'circle',
        symbolSize: 75
    }
});

/**
 * Merge supplied template with base theme config
 */
export const getTemplateWithBaseTheme = (
    template: Spec | TopLevelSpec
): Spec | TopLevelSpec => merge(template, { config: powerbiTheme() });

/**
 * Helper functions to generate color ranges based on theme color palette
 */
export const divergentPalette = () => [
    themeDivergentMin(),
    themeDivergentMax()
];
export const divergentPaletteMed = () => [
    themeDivergentMin(),
    themeDivergentMed(),
    themeDivergentMax()
];
export const ordinalPalette = () =>
    range(ordinalRangeQty).map((i) =>
        getInterpolatedColor(
            themeDivergentMin(),
            themeDivergentMax(),
            (1 / (ordinalRangeQty - 1)) * i
        )
    );
const themeBackgroundNeutral = () =>
    hostServices.colorPalette.backgroundNeutral.value;
const themeFirstLevelElement = () => hostServices.colorPalette.foreground.value;
const themeSecondLevelElement = () =>
    hostServices.colorPalette.foregroundNeutralSecondary.value;
const themeDivergentMin = () =>
    <string>hostServices.colorPalette?.['minimum']?.value;
const themeDivergentMed = () =>
    <string>hostServices.colorPalette?.['neutral']?.value;
const themeDivergentMax = () =>
    <string>hostServices.colorPalette?.['maximium' || 'maximum']?.value; // There's a typo in the palette, so this covers us in case they ever fix it

/**
 * For a given start, and color and percentage between them, work out what the intervening hex code will be.
 */
const getInterpolatedColor = (
    color1: string,
    color2: string,
    ratio: number
) => {
    const cMin = color1.replace('#', '');
    const cMax = color2.replace('#', '');
    const cRatio = Math.round(ratio * 1000) / 1000;
    const hex = (color: number) => {
        const colorString = color.toString(16);
        return colorString.length === 1 ? `0${colorString}` : colorString;
    };
    const r = Math.ceil(
        parseInt(cMax.substring(0, 2), 16) * cRatio +
            parseInt(cMin.substring(0, 2), 16) * (1 - cRatio)
    );
    const g = Math.ceil(
        parseInt(cMax.substring(2, 4), 16) * cRatio +
            parseInt(cMin.substring(2, 4), 16) * (1 - cRatio)
    );
    const b = Math.ceil(
        parseInt(cMax.substring(4, 6), 16) * cRatio +
            parseInt(cMin.substring(4, 6), 16) * (1 - cRatio)
    );
    return `#${hex(r)}${hex(g)}${hex(b)}`;
};
