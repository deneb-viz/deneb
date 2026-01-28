import { type View } from 'vega';
import { logDebug } from '@deneb-viz/utils/logging';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';

/**
 * Extended View type that includes the error handler property.
 * @remarks
 * The `error` property exists on Vega View at runtime but isn't in the TypeScript types.
 */
type ViewWithError = View & {
    error: ((err: Error) => void) | undefined;
};

/**
 * Options for performing an incremental data update on a Vega view.
 */
export type IncrementalUpdateOptions = {
    /**
     * The Vega view to update
     */
    view: View;
    /**
     * The new data values to apply
     */
    values: unknown[];
    /**
     * Callback when the update fails - should trigger re-compile
     */
    onFailure: (reason: string, errorDetails: string | null) => void;
    /**
     * Callback when the update succeeds
     */
    onSuccess: () => void;
};

/**
 * Performs an incremental data update on a Vega view using the view.data() API.
 *
 * This function handles:
 * - Deep copying data to ensure Vega sees new object references
 * - Detecting Vega internal errors via error handler override
 * - Calling appropriate success/failure callbacks
 *
 * @remarks
 * If an error occurs during dataflow evaluation (e.g., stateful transforms like aggregate/force), the `onFailure`
 * callback is invoked with error details so the caller can fall back to a full re-compile.
 */
export const performIncrementalUpdate = ({
    view,
    values,
    onFailure,
    onSuccess
}: IncrementalUpdateOptions): void => {
    /**
     * Track if Vega logs an error during runAsync(). Vega catches errors internally during dataflow evaluation and
     * routes them through `view.error()` rather than rejecting the promise. We temporarily override the error handler
     * to detect these internal errors.
     */
    const viewWithError = view as ViewWithError;
    let internalErrorMessage: string | null = null;
    const originalErrorHandler = viewWithError.error;

    viewWithError.error = (err: Error) => {
        internalErrorMessage = err?.message || String(err);
        logDebug('IncrementalUpdate: Vega internal error detected', {
            error: internalErrorMessage
        });
        // Call original handler to preserve logging
        originalErrorHandler?.call(view, err);
    };

    /**
     * Helper to restore error handler and handle failure.
     */
    const handleFailure = (reason: string, error?: unknown) => {
        viewWithError.error = originalErrorHandler;

        // Build error details string from captured error or passed error
        const errorDetails =
            internalErrorMessage ||
            (error
                ? typeof error === 'string'
                    ? error
                    : (error as Error)?.message || String(error)
                : null);

        logDebug(`IncrementalUpdate: Failed (${reason})`, {
            error: errorDetails
        });

        onFailure(reason, errorDetails);
    };

    try {
        /**
         * Deep copy the values array to ensure Vega sees new object references. A shallow copy via `slice()` isn't
         * sufficient - Vega may check object identity when determining if data has changed for derived datasets.
         */
        const valuesCopy = structuredClone(values);

        /**
         * Single-stage data replacement: Replace data directly and run the view. If an error occurs during dataflow
         * evaluation, we detect it via the error handler override and call the failure callback.
         */
        view.data(DATASET_DEFAULT_NAME, valuesCopy);
        view.runAsync()
            .then(() => {
                // Restore original error handler
                viewWithError.error = originalErrorHandler;

                if (internalErrorMessage) {
                    handleFailure('internal error during update');
                } else {
                    logDebug(
                        'IncrementalUpdate: SUCCESS - Data updated via view.data() API'
                    );
                    onSuccess();
                }
            })
            .catch((error) => {
                handleFailure('runAsync rejected', error?.message || error);
            });
    } catch (error) {
        handleFailure('exception during update', error);
    }
};
