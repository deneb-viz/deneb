/**
 * Result returned from a cross-filter apply operation.
 */
export type CrossFilterApplyResult = {
    rowNumbers?: number[];
    multiSelect?: boolean;
    exceedsLimit?: boolean;
    warning?: string;
};

/**
 * Handler for clearing cross-filter selection.
 */
export type CrossFilterClearHandler = () => void;

/**
 * Handler for applying cross-filter selection.
 */
export type CrossFilterApplyHandler = (
    event: Event,
    filterExpr: string,
    options?: Record<string, unknown>
) => CrossFilterApplyResult;

/**
 * Injectable handlers for custom Vega expressions.
 */
export type ExtensibilityExpressionHandlers = {
    onCrossFilterClear?: CrossFilterClearHandler;
    onCrossFilterApply?: CrossFilterApplyHandler;
};
