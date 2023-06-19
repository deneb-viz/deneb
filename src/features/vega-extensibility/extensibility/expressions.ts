import { expressionFunction } from 'vega';
import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';
import ValueFormatterOptions = valueFormatter.ValueFormatterOptions;

import { generateDynamicPatternFill } from '../pattern-fill';
import { powerBiFormatValue } from '../../../utils';
import { getThemeColorByIndex, getThemeColorByName } from './powerbi-theme';
import { shadeColor } from '../utils';

/**
 * A custom expression that should be added to the Vega view.
 */
interface ICustomExpression {
    name: string;
    method: any;
}

/**
 * Apply any custom expressions that we have written (e.g. formatting) to the
 * specification prior to rendering.
 */
export const registerCustomExpressions = () =>
    expressionsRegistry().forEach((e) => expressionFunction(e.name, e.method));

/**
 * Registry of custom Power BI expressions to apply to the Vega view.
 */
const expressionsRegistry = (): ICustomExpression[] => [
    { name: 'pbiColor', method: pbiColor },
    { name: 'pbiFormat', method: pbiFormat },
    { name: 'pbiPatternSVG', method: pbiPatternSvg }
];

/**
 * Access a color from the Power BI theme by zero-based index, or its internal
 * name, and (optionally) adjust its shade by a percentage.
 */
const pbiColor = (value: string | number, shadePercent: number = 0) =>
    shadeColor(
        getThemeColorByName(`${value}`) ||
            getThemeColorByIndex(parseInt(`${value}`) || 0),
        shadePercent
    );

/**
 * For the supplied value, and format string, apply Power BI-specific
 * formatting to it.
 */
const pbiFormat = (
    datum: any,
    params: string,
    options: ValueFormatterOptions = {}
) => powerBiFormatValue(datum, `${params}`, options);

/**
 * Obtain a dynamic version of a pre-defined pattern, with a custom foregroubd
 * and background color.
 */
const pbiPatternSvg = (id: string, fgColor: string, bgColor: string) => {
    return generateDynamicPatternFill(id, fgColor, bgColor);
};
