import { type Item, type ScenegraphEvent, parseExpression } from 'vega';

import {
    CROSS_FILTER_LIMITS,
    getResolvedCrossFilterResult,
    InteractivityManager,
    type CrossFilterOptions,
    type CrossFilterSelectionDirective,
    type InteractivityLookupDataset
} from '../interactivity';
import { logDebug, logWarning } from '@deneb-viz/utils/logging';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { getDenebState } from '@deneb-viz/app-core';
import { useDenebVisualState } from '../../state';
import { type SelectionMode } from '@deneb-viz/template-usermeta';

/**
 * Result returned from a cross-filter apply operation.
 */
type CrossFilterApplyResult = {
    rowNumbers?: number[];
    multiSelect?: boolean;
    exceedsLimit?: boolean;
    warning?: string;
};

/**
 * Handler for clearing cross-filter selection.
 */
type CrossFilterClearHandler = () => void;

/**
 * Handler for applying cross-filter selection.
 */
type CrossFilterApplyHandler = (
    event: Event,
    filterExpr: string,
    options?: Record<string, unknown>
) => CrossFilterApplyResult;

/**
 * Creates a handler for clearing cross-filter selection via the InteractivityManager.
 */
export const createCrossFilterClearHandler = (): CrossFilterClearHandler => {
    return () => InteractivityManager.crossFilter();
};

/**
 * Creates a handler for applying cross-filter selection with all Power BI-specific logic.
 */
export const createCrossFilterApplyHandler = (): CrossFilterApplyHandler => {
    return (
        event: Event,
        filterExpr: string,
        fOptions?: Record<string, unknown>
    ): CrossFilterApplyResult => {
        const LOG_PREFIX = '[pbiCrossFilterApply]';

        // Get current state from stores
        const { fields, values } = useDenebVisualState.getState().dataset;
        const dataset: InteractivityLookupDataset = { fields, values };
        const selectionMode = useDenebVisualState.getState().settings?.vega
            ?.interactivity?.selectionMode?.value as SelectionMode;
        const {
            specification: { logWarn },
            i18n: { translate }
        } = getDenebState();

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
            const item = <Item>(
                (event as unknown as Record<string, unknown>)['item']
            );
            const expr = getResolvedFilterExpressionForPlaceholder(
                filterExpr,
                item?.datum
            );
            if (expr) {
                parseExpression(expr);
            }
            // Options must be valid
            if (!isCrossFilterOptionValid(fOptions as CrossFilterOptions)) {
                throw new Error(
                    translate(
                        'PowerBI_Text_Warning_Invalid_Cross_Filter_Incorrect_Options'
                    )
                );
            }
            const options = getResolvedCrossFilterOptions(
                expr,
                fOptions as CrossFilterOptions
            );
            logDebug('[pbiCrossFilterApply] resolved cross-filter parameters', {
                expr,
                event,
                item,
                options
            });
            const result = getResolvedCrossFilterResult(
                event as unknown as ScenegraphEvent,
                item,
                dataset,
                translate,
                options
            );
            if (result.warning) {
                throw new Error(result.warning);
            }
            InteractivityManager.crossFilter(result);
            return result;
        } catch (e) {
            logWarn(
                translate(
                    'PowerBI_Text_Warning_Invalid_Cross_Filter_Not_Applied'
                )
            );
            logWarn(
                translate(
                    'PowerBI_Text_Warning_Invalid_Cross_Filter_General_Error',
                    [(e as Error).message]
                )
            );
            logWarning(`${LOG_PREFIX} error`, (e as Error).message);
            return {
                warning: (e as Error).message,
                rowNumbers: []
            };
        }
    };
};

/**
 * Substitute any placeholders in the filter expression with actual values from the datum. We also consider the type
 * of a resolved property from the datum, to ensure that we replace with the correct criteria.
 */
const getResolvedFilterExpressionForPlaceholder = (
    filterExpr: string,
    datum: Record<string, unknown>
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
): CrossFilterOptions => {
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
const isEventPresent = (event: unknown) => event && event instanceof Event;

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
