import { falsy, truthy, View } from 'vega';
import { handleContextMenuEvent } from '../../interactivity/context-menu';
import { handleCrossFilterEvent } from '../../interactivity/cross-filter';
import { logDebug, StoreVegaLoggerService } from '../../logging';
import { hostServices } from '../../../core/services';
import { getState } from '../../../store';
import { VegaPatternFillServices } from '../pattern-fill';

export { getVegaLoader } from './loader';

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
 * Any logic that we need to apply to a new Vega view.
 */
export const handleNewView = (newView: View) => {
    logDebug('Vega view initialized.');
    hostServices.renderingStarted();
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
        bindContextMenuEvents(view);
        bindCrossFilterEvents(view);
        getState().interface.generateRenderId();
        hostServices.renderingFinished();
    });
};

/**
 * Any logic that we need to apply when the view errors.
 */
export const handleViewError = (error: Error, containerRef: HTMLDivElement) => {
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
