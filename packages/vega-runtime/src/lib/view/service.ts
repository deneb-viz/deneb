import { falsy, truthy, View } from 'vega';
import { getSignalPbiContainer } from '@deneb-viz/powerbi-compat/signals';
import { logDebug, logTimeEnd } from '@deneb-viz/utils/logging';
import { VegaPatternFillServices } from '../pattern-fill';
import { DispatchingVegaLoggerService } from '../extensibility';
import { HandleNewViewOptions, HandleViewErrorOptions } from './types';
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
     * dataset table). Returns an empty object if nothing is available.
     */
    getAllData: () =>
        view?.getState({
            data: truthy,
            signals: falsy,
            recurse: true
        })?.data || {},
    /**
     * Get all signals and values from the current Vega view (for the signals
     * table). Returns an empty object if nothing is available.
     */
    getAllSignals: (): Record<string, unknown> =>
        view?.getState({
            data: falsy,
            signals: truthy,
            recurse: true
        })?.signals || {},
    /**
     * Get specified data stream from view by name.
     */
    getDataByName: (name: string): VegaDatum[] | undefined => view?.data(name),
    /**
     * Get specified signal from view by name.
     */
    getSignalByName: (name: string) => view?.signal(name),
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

/**
 * For the supplied view, bind the custom container signals.
 */
const bindContainerSignals = (view: View) => {
    const update = () => {
        const container = view.container();
        if (container) {
            const signal = getSignalPbiContainer({ container });
            VegaViewServices.setSignalByName(signal.name, signal.value);
        }
    };
    update();
    view.addResizeListener(() => {
        update();
    });
};

/**
 * Any logic that we need to apply to a new Vega view.
 */
export const handleNewView = (newView: View, options: HandleNewViewOptions) => {
    logDebug('Vega view initialized.');
    options.onRenderingStarted?.();
    const {
        generateRenderId,
        logError,
        logWarn,
        logLevel,
        viewEventBinders,
        onRenderingFinished
    } = options;
    newView.logger(
        new DispatchingVegaLoggerService(logLevel, logWarn, logError)
    );
    newView.runAfter((view) => {
        logDebug('Running post-Vega view logic...', view);
        logDebug('Binding view services...');
        VegaPatternFillServices.update();
        VegaViewServices.bind(view);
        logDebug('View services', {
            view: VegaViewServices.getView(),
            signals: VegaViewServices.getAllSignals(),
            data: VegaViewServices.getAllData()
        });
        bindContainerSignals(view);
        viewEventBinders?.forEach((binder) => binder(view));
        generateRenderId();
        logTimeEnd('VegaRender');
        onRenderingFinished?.();
    });
};

/**
 * Any logic that we need to apply when the view errors.
 */
export const handleViewError = (
    error: Error,
    options: HandleViewErrorOptions
) => {
    logDebug('Vega view error.', error);
    const { generateRenderId, logError, onRenderingError } = options;
    logDebug('Clearing view...');
    VegaViewServices.clearView();
    logDebug('View services', {
        view: VegaViewServices.getView(),
        signals: VegaViewServices.getAllSignals(),
        data: VegaViewServices.getAllData()
    });
    logError(error.message);
    generateRenderId();
    onRenderingError?.(error);
};
