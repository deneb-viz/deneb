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
     * Set specified signal in view by name. f it does not exist, it will not be set.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSignalByName: (name: string, value: any) => {
        if (VegaViewServices.doesSignalNameExist(name)) {
            view?.signal(name, value);
            view?.runAsync();
        }
    },
    /**
     * Obtain the current Vega view.
     */
    getView: () => view
};
Object.freeze(VegaViewServices);
