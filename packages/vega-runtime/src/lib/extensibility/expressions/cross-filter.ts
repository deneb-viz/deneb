import { logDebug } from '@deneb-viz/utils/logging';
import { VegaExtensibilityServices } from '../service';
import { type CrossFilterApplyResult } from '../types';

/**
 * Request the host platform to clear any cross-filter selection.
 * No-ops if no handler is registered.
 */
export const pbiCrossFilterClear = () => {
    const { onCrossFilterClear } =
        VegaExtensibilityServices.getExpressionHandlers();
    onCrossFilterClear?.();
};

/**
 * Request the host platform to apply a cross-filter selection.
 * Returns empty result if no handler is registered.
 */
export const pbiCrossFilterApply = (
    event: unknown,
    filterExpr: string,
    options?: Record<string, unknown>
): CrossFilterApplyResult => {
    const LOG_PREFIX = '[pbiCrossFilterApply]';
    const { onCrossFilterApply } =
        VegaExtensibilityServices.getExpressionHandlers();

    if (!onCrossFilterApply) {
        logDebug(`${LOG_PREFIX} no handler registered, skipping`);
        return {};
    }

    return onCrossFilterApply(event as Event, filterExpr, options);
};
