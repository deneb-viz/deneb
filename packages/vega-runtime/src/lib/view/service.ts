import { falsy, truthy, View } from 'vega';
import {
    setRenderingFinished,
    setRenderingStarted
} from '@deneb-viz/powerbi-compat/visual-host';
import { getSignalPbiContainer } from '@deneb-viz/powerbi-compat/signals';
import { logDebug, logTimeEnd } from '@deneb-viz/utils/logging';
import {
    contextMenuHandler,
    crossFilterHandler,
    type CrossFilterTranslate,
    type VegaDatum,
    type InteractivityLookupDataset
} from '@deneb-viz/powerbi-compat/interactivity';
import { VegaPatternFillServices } from '../pattern-fill';
import { DispatchingVegaLoggerService } from '../extensibility';
import { HandleNewViewOptions, HandleViewErrorOptions } from './types';

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
    getAllSignals: () =>
        view?.getState({
            data: truthy,
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
 * For the supplied View, check conditions for context menu binding, and
 * apply/remove as necessary.
 */
const bindContextMenuEvents = (
    view: View,
    dataset: InteractivityLookupDataset
) => {
    logDebug('Binding context menu listener...');
    view.addEventListener('contextmenu', contextMenuHandler(dataset));
};

/**
 * For the supplied View, check conditions for data point selection binding,
 * and apply/remove as necessary.
 */
const bindCrossFilterEvents = (
    view: View,
    dataset: InteractivityLookupDataset,
    translate: CrossFilterTranslate
) => {
    logDebug('Binding cross-filter listener...');
    view.addEventListener('click', crossFilterHandler(dataset, translate));
};

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
    setRenderingStarted();
    const {
        dataset,
        generateRenderId,
        logError,
        logWarn,
        translate,
        logLevel,
        selectionMode
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
        bindContextMenuEvents(view, dataset);
        if (selectionMode === 'simple') {
            bindCrossFilterEvents(view, dataset, translate);
        }
        generateRenderId();
        logTimeEnd('VegaRender');
        setRenderingFinished();
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
    const { generateRenderId, logError } = options;
    logDebug('Clearing view...');
    VegaViewServices.clearView();
    logDebug('View services', {
        view: VegaViewServices.getView(),
        signals: VegaViewServices.getAllSignals(),
        data: VegaViewServices.getAllData()
    });
    logError(error.message);
    generateRenderId();
};
