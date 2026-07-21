import { falsy, truthy, View } from 'vega';
import { logDebug } from '@deneb-viz/utils/logging';
import { type VegaDatum } from '@deneb-viz/data-core/value';

let view: View | null;

/**
 * Use to bind the specified Vega view to this API for use in the application
 * lifecycle. We don't keep this in the store because it's monolithic and
 * causes all kinds of issues with the Redux devtools when inspecting and
 * debugging. As such, any dependent components need to factor this into their
 * rendering logic.
 */
export const VegaViewServices = {
    bind: (v: View) => {
        view = v;
    },
    /**
     * In the event of errors, we should clear the current view, to avoid keeping
     * any stale state between renders.
     */
    clearView: () => (view = null),
    /**
     * Check if a signal with the specified name exists in the current Vega view.
     */
    doesSignalNameExist: (name: string) =>
        VegaViewServices.getAllSignals()[name] !== undefined,
    /**
     * Get all datasets and their content from the current Vega view (for the
     * dataset table). Returns an empty object if nothing is available or if an error occurs.
     */
    getAllData: () => {
        try {
            return (
                view?.getState({
                    data: truthy,
                    signals: falsy,
                    recurse: true
                })?.data || {}
            );
        } catch (error) {
            logDebug('VegaViewServices.getAllData: Error getting data', {
                error
            });
            return {};
        }
    },
    /**
     * Get all signals and values from the current Vega view (for the signals
     * table). Returns an empty object if nothing is available or if an error occurs.
     */
    getAllSignals: (): Record<string, unknown> => {
        try {
            return (
                view?.getState({
                    data: falsy,
                    signals: truthy,
                    recurse: true
                })?.signals || {}
            );
        } catch (error) {
            logDebug('VegaViewServices.getAllSignals: Error getting signals', {
                error
            });
            return {};
        }
    },
    /**
     * Get specified data stream from view by name. Returns undefined if an error occurs.
     */
    getDataByName: (name: string): VegaDatum[] | undefined => {
        try {
            return view?.data(name);
        } catch (error) {
            logDebug(
                `VegaViewServices.getDataByName: Error getting data ${name}`,
                { error }
            );
            return undefined;
        }
    },
    /**
     * Determine whether a named dataset is present in the current view,
     * distinguishing a genuine absence from a failed lookup.
     *
     * `getDataByName` cannot make this distinction: it swallows every error
     * (including the "Unrecognized data set" throw Vega raises for a name the
     * spec never bound) and returns `undefined` in all of those cases as well
     * as for a legitimately-absent dataset. Callers that must treat only a true
     * absence as "ignore this data change" — and a real failure as "fall back
     * to a re-compile" — use this instead of `getDataByName(name) === undefined`.
     *
     * Reads the view's data-source keys via `getState` (which lists the
     * datasets that exist without throwing for an individual missing name), so
     * an absence and a failure are cleanly separable:
     * - `'present'` — the view exposes a dataset with this name.
     * - `'absent'`  — reading the state succeeded and there is no such dataset
     *   (e.g. the spec uses inline or remote data).
     * - `'error'`   — no view is bound, or reading the view's state threw. The
     *   caller must NOT treat this as a legitimate absence.
     */
    getDatasetPresence: (name: string): 'present' | 'absent' | 'error' => {
        if (!view) {
            return 'error';
        }
        try {
            const data =
                view.getState({
                    data: truthy,
                    signals: falsy,
                    recurse: true
                })?.data ?? {};
            return name in data ? 'present' : 'absent';
        } catch (error) {
            logDebug(
                `VegaViewServices.getDatasetPresence: Error checking dataset ${name}`,
                { error }
            );
            return 'error';
        }
    },
    /**
     * Get specified signal from view by name. Returns undefined if an error occurs.
     */
    getSignalByName: (name: string) => {
        try {
            return view?.signal(name);
        } catch (error) {
            logDebug(
                `VegaViewServices.getSignalByName: Error getting signal ${name}`,
                { error }
            );
            return undefined;
        }
    },
    /**
     * Set specified signal in view by name. If it does not exist, it will not
     * be set.
     *
     * Writing a signal re-runs the dataflow, which can reject (e.g. a stateful
     * transform errors on the new value). That `runAsync()` promise must not be
     * left floating — an unhandled rejection would surface nowhere useful. The
     * rejection is always caught and logged at debug level here; when an
     * `onError` sink is supplied by the caller it is also routed there so the
     * failure can reach a user-facing channel (mirroring the dual-channel
     * handling in `incremental-update.ts`). The already-handled promise is
     * returned so callers/tests can await settling; existing two-argument
     * callers are unaffected and default to the internal debug-log sink.
     */
    setSignalByName: (
        name: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any,
        onError?: (error: unknown) => void
    ): Promise<unknown> | undefined => {
        if (!VegaViewServices.doesSignalNameExist(name)) {
            return undefined;
        }
        view?.signal(name, value);
        return view?.runAsync().catch((error) => {
            logDebug(
                `VegaViewServices.setSignalByName: Error running view after setting signal ${name}`,
                { error }
            );
            onError?.(error);
        });
    },
    /**
     * Obtain the current Vega view.
     */
    getView: () => view
};
Object.freeze(VegaViewServices);
