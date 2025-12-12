import { expressionFunction } from 'vega';
import { CustomExpressionRegistry } from './types';
import { pbiColor } from './color';
import { pbiFormat, pbiFormatAutoUnit } from './formatting';
import { pbiPatternSvg } from './pattern-fill';
import { pbiCrossFilterApply, pbiCrossFilterClear } from './cross-filter';

/**
 * Apply any custom expressions that we have written (e.g. formatting) to the specification prior to rendering.
 */
export const registerCustomExpressions = () =>
    expressionsRegistry().forEach((e) => expressionFunction(e.name, e.method));

/**
 * Registry of custom Power BI expressions to apply to the Vega view.
 */
const expressionsRegistry = (): CustomExpressionRegistry => [
    { name: 'pbiColor', method: pbiColor },
    { name: 'pbiFormat', method: pbiFormat },
    { name: 'pbiFormatAutoUnit', method: pbiFormatAutoUnit },
    { name: 'pbiPatternSVG', method: pbiPatternSvg },
    { name: 'pbiCrossFilterClear', method: pbiCrossFilterClear },
    { name: 'pbiCrossFilterApply', method: pbiCrossFilterApply }
];
