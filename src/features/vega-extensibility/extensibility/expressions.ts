import { Item, expressionFunction, parseExpression } from 'vega';
import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';
import ValueFormatterOptions = valueFormatter.ValueFormatterOptions;

import { generateDynamicPatternFill } from '../pattern-fill';
import { powerBiFormatValue } from '../../../utils';
import { getThemeColorByIndex, getThemeColorByName } from './powerbi-theme';
import { shadeColor } from '../utils';
import { clone } from 'lodash';
import {
    CrossFilterOptions,
    CrossFilterResult,
    clearSelection
} from '../../interactivity';
import { getState } from '../../../store';
import { getI18nValue } from '../../i18n';
import { CROSS_FILTER_LIMITS, PROPERTY_DEFAULTS } from '../../../../config';
import { handleCrossFilterEvent } from '../../interactivity/cross-filter';
import { logDebug, logWarning } from '../../logging';

/**
 * A custom expression that should be added to the Vega view.
 */
interface ICustomExpression {
    name: string;
    method: any;
}

/**
 * Apply any custom expressions that we have written (e.g. formatting) to the specification prior to rendering.
 */
export const registerCustomExpressions = () =>
    expressionsRegistry().forEach((e) => expressionFunction(e.name, e.method));

/**
 * Registry of custom Power BI expressions to apply to the Vega view.
 */
const expressionsRegistry = (): ICustomExpression[] => [
    { name: 'pbiColor', method: pbiColor },
    { name: 'pbiFormat', method: pbiFormat },
    { name: 'pbiPatternSVG', method: pbiPatternSvg },
    { name: 'pbiCrossFilterClear', method: pbiCrossFilterClear },
    { name: 'pbiCrossFilterApply', method: pbiCrossFilterApply }
];

/**
 * Access a color from the Power BI theme by zero-based index, or its internal name, and (optionally) adjust its shade
 * by a percentage.
 */
const pbiColor = (value: string | number, shadePercent: number = 0) =>
    shadeColor(
        getThemeColorByName(`${value}`) ||
            getThemeColorByIndex(parseInt(`${value}`) || 0),
        shadePercent
    );

/**
 * For the supplied value, and format string, apply Power BI-specific formatting to it.
 */
const pbiFormat = (
    datum: any,
    params: string,
    options: ValueFormatterOptions = {}
) => powerBiFormatValue(datum, `${params}`, options);

/**
 * Obtain a dynamic version of a pre-defined pattern, with a custom foreground and background color.
 */
const pbiPatternSvg = (id: string, fgColor: string, bgColor: string) => {
    return generateDynamicPatternFill(id, fgColor, bgColor);
};

/**
 * Explicitly request the visual host to clear any selection that has been applied to the visual.
 */
const pbiCrossFilterClear = () => clearSelection();

/**
 * Take supplied criteria and attempt to apply a cross-filter to the visual host based upon it.
 */
const pbiCrossFilterApply = (
    event: any,
    filterExpr: string,
    fOptions: CrossFilterOptions
) => {
    const {
        specification: { logWarn },
        visualSettings: {
            vega: { selectionMode }
        }
    } = getState();
    logDebug('[pbiCrossFilterApply] cross-filter event fired from view', {
        event,
        expr: filterExpr
    });
    if (selectionMode !== 'advanced') {
        logWarn(
            getI18nValue('Text_Warning_Invalid_Cross_Filter_Incorrect_Mode')
        );
        return {};
    }
    try {
        // Event must be valid
        if (!isEventPresent(event)) {
            throw new Error(
                getI18nValue('Text_Warning_Invalid_Cross_Filter_Event_Type')
            );
        }
        // Expression must be valid string, and parse successfully, after substitution
        // if missing, we assume simple (legacy) cross-filtering
        if (!isExpressionPresent(filterExpr)) {
            throw new Error(
                getI18nValue('Text_Warning_Invalid_Cross_Filter_Missing_Filter')
            );
        }
        const item = clone(<Item>event['item']);
        const expr = getResolvedFilterExpressionForPlaceholder(
            filterExpr,
            item.datum
        );
        if (expr) {
            parseExpression(expr);
        }
        // Options must be valid
        if (!isCrossFilterOptionValid(fOptions)) {
            throw new Error(
                getI18nValue(
                    'Text_Warning_Invalid_Cross_Filter_Incorrect_Options'
                )
            );
        }
        const options = getResolvedCrossFilterOptions(expr, fOptions);
        logDebug('[pbiCrossFilterApply] resolved cross-filter parameters', {
            expr,
            event,
            item,
            options
        });
        const result = handleCrossFilterEvent(event, item, options);
        if (result.warning) {
            throw new Error(result.warning);
        }
        return result;
    } catch (e) {
        logWarn(getI18nValue('Text_Warning_Invalid_Cross_Filter_Not_Applied'));
        logWarn(
            getI18nValue('Text_Warning_Invalid_Cross_Filter_General_Error', [
                e.message
            ])
        );
        logWarning('[pbiCrossFilterApply] error', e.message);
        return <CrossFilterResult>{ warning: e.message, identities: [] };
    }
};

/**
 * Substitute any placeholders in the filter expression with actual values from the datum. We also consider the type
 * of a resolved property from the datum, to ensure that we replace with the correct criteria.
 */
const getResolvedFilterExpressionForPlaceholder = (
    filterExpr: string,
    datum: any
) =>
    filterExpr?.replace(/_{(.*?)}_/g, (m, m1) => {
        const value = datum[m1];
        if (typeof value === 'number' || typeof value === 'boolean') {
            return `${value}`;
        }
        if (value instanceof Date) {
            return `datetime('${value.toISOString()}')`;
        }
        return `'${datum[m1]}'`;
    });

/**
 * Create the correctly structured options object for advanced cross-filtering, based on what is supplied by the user
 * vs. defaults.
 */
const getResolvedCrossFilterOptions = (
    expr: string,
    options: CrossFilterOptions
) => {
    const baseOptions: CrossFilterOptions = {
        mode: expr ? 'advanced' : 'simple',
        filterExpr: expr,
        limit: PROPERTY_DEFAULTS.vega.selectionMaxDataPoints,
        multiSelect: ['ctrl', 'shift']
    };
    return { ...baseOptions, ...options };
};

/**
 * Confirm that the author provided a valid event object for cross-filtering.
 */
const isEventPresent = (event: any) => event && event instanceof Event;

/**
 * Confirm that the author provided a valid expression for cross-filtering. The expression is optional, but if
 * supplied it needs to be string-valued.
 */
const isExpressionPresent = (expr: string) => !expr || typeof expr === 'string';

/**
 * Confirm that the author provided valid options for cross-filtering. The options can be omitted, but if they are
 * supplied, we should validate properties as appropriate.
 */
const isCrossFilterOptionValid = (options: CrossFilterOptions) =>
    !options ||
    (options && typeof options === 'object' && options.limit
        ? options.limit >= CROSS_FILTER_LIMITS.minDataPointsValue &&
          options.limit <= CROSS_FILTER_LIMITS.maxDataPointsAdvancedValue
        : true);
