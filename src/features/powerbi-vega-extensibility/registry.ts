import { expressionFunction, scheme } from 'vega';
import { fillPatternServices, hostServices } from '../../core/services';

import { powerBiFormatValue } from '../../utils';
import {
    divergentPalette,
    divergentPaletteMed,
    getThemeColorByIndex,
    ordinalPalette,
    shadeColor
} from './theme';
import { IPowerBIExpression, IPowerBISchemes } from './types';

/**
 * Access a color from the Power BI theme by zero-based index, and (optionally)
 * adjust its shade by a percentage.
 */
const pbiColor = (value: string | number, shadePercent: number = 0) =>
    shadeColor(getThemeColorByIndex(parseInt(`${value}`) || 0), shadePercent);

/**
 * For the supplied value, and format string, apply Power BI-specific
 * formatting to it.
 */
const pbiFormat = (datum: any, params: string) =>
    powerBiFormatValue(datum, `${params}`);

/**
 * Obtain a dynamic version of a pre-defined pattern, with a custom foregroubd
 * and background color.
 */
const pbiPatternSvg = (id: string, fgColor: string, bgColor: string) => {
    return fillPatternServices.generateDynamicPattern(id, fgColor, bgColor);
};

/**
 * Apply any custom expressions that we have written (e.g. formatting) to the
 * specification prior to rendering.
 */
export const registerPowerBiCustomExpressions = () =>
    powerBiExpressions().forEach((e) => expressionFunction(e.name, e.method));

/**
 * Bind custom schemes to the view that sync to the report theme.
 */
export const registerPowerBiCustomSchemes = () =>
    powerBiSchemes().forEach((s) => scheme(s.name, s.values));

/**
 * Registry of custom Power BI expressions to apply to the Vega view.
 */
const powerBiExpressions = (): IPowerBIExpression[] => [
    { name: 'pbiColor', method: pbiColor },
    { name: 'pbiFormat', method: pbiFormat },
    { name: 'pbiPatternSVG', method: pbiPatternSvg }
];

/**
 * Registry of custom Power BI schemes to add to the Vega view.
 */
const powerBiSchemes = (): IPowerBISchemes[] => [
    { name: 'pbiColorNominal', values: hostServices.getThemeColors() },
    { name: 'pbiColorOrdinal', values: ordinalPalette() },
    { name: 'pbiColorLinear', values: divergentPalette() },
    { name: 'pbiColorDivergent', values: divergentPaletteMed() }
];
