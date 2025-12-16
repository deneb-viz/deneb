import { type Item, parseExpression } from 'vega';

import {
    CROSS_FILTER_LIMITS,
    crossFilterHandler,
    type CrossFilterOptions,
    type CrossFilterSelectionDirective,
    InteractivityManager
} from '@deneb-viz/powerbi-compat/interactivity';
import { logDebug, logWarning } from '@deneb-viz/utils/logging';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { VegaExtensibilityServices } from '../service';

/**
 * Explicitly request the visual host to clear any selection that has been applied to the visual.
 */
export const pbiCrossFilterClear = () => InteractivityManager.crossFilter();

/**
 * Take supplied criteria and attempt to apply a cross-filter to the visual host based upon it.
 */
export const pbiCrossFilterApply = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: any,
    filterExpr: string,
    fOptions: CrossFilterOptions
) => {
    const LOG_PREFIX = '[pbiCrossFilterApply]';
    const { dataset, selectionMode, logWarn, translate } =
        VegaExtensibilityServices.getOptions();
    logDebug(`${LOG_PREFIX} cross-filter event fired from view`, {
        event,
        expr: filterExpr
    });
    if (selectionMode !== 'advanced') {
        logWarn(
            translate(
                'PowerBI_Text_Warning_Invalid_Cross_Filter_Incorrect_Mode'
            )
        );
        return {};
    }
    try {
        // Event must be valid
        if (!isEventPresent(event)) {
            throw new Error(
                translate(
                    'PowerBI_Text_Warning_Invalid_Cross_Filter_Event_Type'
                )
            );
        }
        // Expression must be valid string, and parse successfully, after substitution
        // if missing, we assume simple (legacy) cross-filtering
        if (!isExpressionPresent(filterExpr)) {
            throw new Error(
                translate(
                    'PowerBI_Text_Warning_Invalid_Cross_Filter_Missing_Filter'
                )
            );
        }
        const item = <Item>event['item'];
        const expr = getResolvedFilterExpressionForPlaceholder(
            filterExpr,
            item?.datum
        );
        if (expr) {
            parseExpression(expr);
        }
        // Options must be valid
        if (!isCrossFilterOptionValid(fOptions)) {
            throw new Error(
                translate(
                    'PowerBI_Text_Warning_Invalid_Cross_Filter_Incorrect_Options'
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
        const result = crossFilterHandler(
            dataset,
            translate,
            options
        )(event, item) as unknown as CrossFilterSelectionDirective;
        if (result.warning) {
            throw new Error(result.warning);
        }
        return result;
    } catch (e) {
        logWarn(
            translate('PowerBI_Text_Warning_Invalid_Cross_Filter_Not_Applied')
        );
        logWarn(
            translate(
                'PowerBI_Text_Warning_Invalid_Cross_Filter_General_Error',
                [(e as Error).message]
            )
        );
        logWarning(`${LOG_PREFIX} error`, (e as Error).message);
        return <CrossFilterSelectionDirective>{
            warning: (e as Error).message,
            rowNumbers: []
        };
    }
};

/**
 * Substitute any placeholders in the filter expression with actual values from the datum. We also consider the type
 * of a resolved property from the datum, to ensure that we replace with the correct criteria.
 */
const getResolvedFilterExpressionForPlaceholder = (
    filterExpr: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    datum: any
) =>
    filterExpr?.replace(/_{(.*?)}_/g, (m, m1) => {
        const value = datum?.[m1];
        if (typeof value === 'number' || typeof value === 'boolean') {
            return `${value}`;
        }
        if (value instanceof Date) {
            return `toDate('${value}')`;
        }
        return `'${datum?.[m1]}'`;
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
        limit: DEFAULTS.vega.selectionMaxDataPoints,
        multiSelect: ['ctrl', 'shift']
    };
    return { ...baseOptions, ...options };
};

/**
 * Confirm that the author provided a valid event object for cross-filtering.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
