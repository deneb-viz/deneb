import { falsy, truthy, View } from 'vega';
import { handleContextMenuEvent } from '../../interactivity/context-menu';
import { handleCrossFilterEvent } from '../../interactivity/cross-filter';
import { logDebug, logTimeEnd, StoreVegaLoggerService } from '../../logging';
import { getState } from '../../../store';
import { VegaPatternFillServices } from '../pattern-fill';
import { IVegaViewServices } from '../types';
import {
    setRenderingFinished,
    setRenderingStarted
} from '@deneb-viz/powerbi-compat/visual-host';
import { getSignalPbiContainer } from '@deneb-viz/powerbi-compat/signals';

export { getVegaLoader } from './loader';

let view: View | null;

/**
 * Use to bind the specified Vega view to this API for use in the application
 * lifecycle. We don't keep this in the store because it's monolithic and
 * causes all kinds of issues with the Redux devtools when inspecting and
 * debugging. As such, any dependent components need to factor this into their
 * rendering logic.
 */
export const VegaViewServices: IVegaViewServices = {
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
    getDataByName: (name: string) => view?.data(name),
    /**
     * Get specified signal from view by name.
     */
    getSignalByName: (name: string) => view?.signal(name),
    /**
     * Set specified signal in view by name. f it does not exist, it will not be set.
     */
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
const bindContextMenuEvents = (view: View) => {
    logDebug('Binding context menu listener...');
    view.addEventListener('contextmenu', handleContextMenuEvent);
};

/**
 * For the supplied View, check conditions for data point selection binding,
 * and apply/remove as necessary.
 */
const bindCrossFilterEvents = (view: View) => {
    logDebug('Binding cross-filter menu listener...');
    view.addEventListener('click', handleCrossFilterEvent);
};

/**
 * For the supplied view, bind the custom container signals.
 */
const bindContainerSignals = (view: View) => {
    const update = () => {
        const container = view.container();
        const signal = getSignalPbiContainer({ container });
        VegaViewServices.setSignalByName(signal.name, signal.value);
    };
    update();
    view.addResizeListener(() => {
        update();
    });
};

/**
 * Any logic that we need to apply to a new Vega view.
 */
export const handleNewView = (newView: View) => {
    logDebug('Vega view initialized.');
    setRenderingStarted();
    const {
        interface: { generateRenderId },
        visualSettings: {
            vega: {
                interactivity: {
                    selectionMode: { value: selectionMode }
                }
            }
        }
    } = getState();
    newView.logger(new StoreVegaLoggerService());
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
        bindContextMenuEvents(view);
        selectionMode === 'simple' && bindCrossFilterEvents(view);
        generateRenderId();
        logTimeEnd('VegaRender');
        setRenderingFinished();
    });
};

/**
 * Any logic that we need to apply when the view errors.
 */
export const handleViewError = (error: Error) => {
    logDebug('Vega view error.', error);
    logDebug('Clearing view...');
    const {
        interface: { generateRenderId },
        specification: { logError }
    } = getState();
    VegaViewServices.clearView();
    logDebug('View services', {
        view: VegaViewServices.getView(),
        signals: VegaViewServices.getAllSignals(),
        data: VegaViewServices.getAllData()
    });
    logError(error.message);
    generateRenderId();
};
