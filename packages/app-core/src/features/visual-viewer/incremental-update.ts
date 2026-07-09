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
 * Views that currently have an incremental update in flight.
 *
 * `viewReady` is NOT toggled during an incremental update, so a second rapid
 * Power BI update can call `performIncrementalUpdate` again while the first
 * call's `runAsync()` is still pending. Two overlapping runs corrupt the
 * `view.error` handler chain: the second captures the first's OVERRIDE as "the
 * original" and, on restore, can leave a dead override permanently installed
 * (audit M7). We serialize per view — the second call defers to a full
 * re-compile instead of installing an overlapping override. A `WeakSet` keyed
 * to the `View` releases the entry automatically once the view is GC'd.
 */
const inFlightIncrementalUpdates = new WeakSet<View>();

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
     * Serialize per view (audit M7). If a previous update on this view is still
     * pending, do NOT start a second overlapping override — that would corrupt
     * the `view.error` restore chain. Defer to a full re-compile, which rebuilds
     * the view from the latest data and supersedes the in-flight run. We must
     * not clear the in-flight flag here: it belongs to the run already in
     * progress, which will clear it when it settles.
     */
    if (inFlightIncrementalUpdates.has(view)) {
        logDebug(
            'IncrementalUpdate: an update is already in flight for this view - deferring to re-compile'
        );
        onFailure('a concurrent update was already in progress', null);
        return;
    }
    inFlightIncrementalUpdates.add(view);

    /**
     * Track if Vega logs an error during runAsync(). Vega catches errors internally during dataflow evaluation and
     * routes them through `view.error()` rather than rejecting the promise. We temporarily override the error handler
     * to detect these internal errors.
     */
    const viewWithError = view as ViewWithError;
    let internalErrorMessage: string | null = null;
    const originalErrorHandler = viewWithError.error;

    /**
     * The override we install. Kept as a stable reference so the restore below
     * can verify — via identity — that OURS is still the active handler before
     * writing the original back.
     */
    const errorOverride = (err: Error) => {
        internalErrorMessage = err?.message || String(err);
        logDebug('IncrementalUpdate: Vega internal error detected', {
            error: internalErrorMessage
        });
        // Call original handler to preserve logging
        originalErrorHandler?.call(view, err);
    };
    viewWithError.error = errorOverride;

    /**
     * Restore the error handler and release the in-flight flag. Run on every
     * terminal path (success, failure, exception).
     *
     * The restore is token-checked (audit M7): only write `originalErrorHandler`
     * back if OUR override is still installed. If something else (a later run,
     * teardown) has since replaced it, leave that newer handler in place rather
     * than clobbering it or reinstating a stale override.
     */
    const finalize = () => {
        if (viewWithError.error === errorOverride) {
            viewWithError.error = originalErrorHandler;
        }
        inFlightIncrementalUpdates.delete(view);
    };

    /**
     * Helper to restore error handler and handle failure.
     */
    const handleFailure = (reason: string, error?: unknown) => {
        finalize();

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
                if (internalErrorMessage) {
                    handleFailure('internal Vega error during update');
                } else {
                    finalize();
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

/**
 * How the data-change effect should respond to a host data update.
 *
 * - `'ignore'`      — the compiled view has no binding for the default dataset
 *   (the spec uses inline or remote data), so the change is irrelevant.
 * - `'recompile'`   — perform a full re-compile. Chosen when the dataset lookup
 *   FAILED (so the update is not silently dropped — audit L3), when incremental
 *   updates are disabled, or when the row count exceeds the effective threshold.
 * - `'incremental'` — reconcile the new data in place via `view.data()`.
 */
export type DataChangeAction = 'ignore' | 'recompile' | 'incremental';

/**
 * Decide how to apply a host data change, given whether the view binds the
 * default dataset (`datasetPresence`) and the incremental-update settings.
 *
 * Distinguishing a failed dataset lookup (`'error'`) from a genuine absence
 * (`'absent'`) is the crux of audit L3: a failure routes to a full re-compile
 * rather than being mistaken for "spec uses inline data" and dropped. The
 * three-state input comes from `VegaViewServices.getDatasetPresence`.
 */
export const resolveDataChangeAction = (
    datasetPresence: 'present' | 'absent' | 'error',
    enableIncrementalDataUpdates: boolean,
    rowCount: number,
    effectiveThreshold: number
): DataChangeAction => {
    if (datasetPresence === 'absent') {
        return 'ignore';
    }
    if (
        datasetPresence === 'error' ||
        !enableIncrementalDataUpdates ||
        rowCount > effectiveThreshold
    ) {
        return 'recompile';
    }
    return 'incremental';
};
