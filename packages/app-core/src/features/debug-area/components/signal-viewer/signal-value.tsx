import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePrevious } from '@uidotdev/usehooks';

import { logDebug, logRender } from '@deneb-viz/utils/logging';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { DataTableCell } from '../data-table/data-table-cell';
import { useDenebState } from '../../../../state';
import {
    computeSignalDisplay,
    INVALID_SIGNAL_DISPLAY
} from './signal-value-utils';

type SignalValueProps = {
    signalName: string;
    renderId?: string;
    rowIndex?: number;
};

/**
 * Safely gets the initial value of a signal from the Vega view.
 * Some Vega signals (particularly bin-related ones) contain accessor functions that can throw when evaluated without
 * a proper `datum` context.
 */
const getInitialSignalValue = (signalName: string) => {
    try {
        return VegaViewServices.getSignalByName(signalName);
    } catch (error) {
        logDebug(`Error getting initial signal value for "${signalName}":`, {
            error
        });
        return null;
    }
};

/**
 * Renders similar output as a `DataTableCell`, but instead will bind to the specified signal in the Vega view, and
 * will update the cell value when the signal changes.
 *
 * @privateRemarks [DM-P]: there is some technical debt here, where we're using `signalValue` as a triggering mechanism
 * for renders, but not for displaying its actual value (opting to go directly to the view instead).
 *
 * There seem to be some edge cases where the correct value is not returned, despite events and hooks lining-up
 * correctly. This needs more time to investigate (and is likely programmer error on my part), but as the render
 * happens anyway and it only affects dynamic signal values, this is an acceptable risk for now.
 */
// eslint-disable-next-line max-lines-per-function
export const SignalValue = ({
    signalName,
    renderId,
    rowIndex
}: SignalValueProps) => {
    const previousSignalName = usePrevious(signalName);
    /**
     * Use a lazy initializer with error handling to safely get the initial value.
     * Some Vega signals (particularly bin-related ones) contain accessor functions that can throw when evaluated
     * without a proper `datum` context.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [signalValue, setSignalValue] = useState<any>(() =>
        getInitialSignalValue(signalName)
    );
    const translate = useDenebState((state) => state.i18n.translate);
    // Vega matches listener registrations by reference identity. Without a
    // stable reference, every re-render would create a new closure — add
    // would register the new one while remove would try to detach a
    // different function that was never registered, silently leaking
    // listeners on the Vega view across renders and signal/view changes.
    // Hold the currently-registered listener plus the signal name it was
    // registered against so a mid-flight signalName change still detaches
    // from the correct signal.
    const activeListenerRef = useRef<{
        signalName: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listener: (name: string, value: any) => void;
    } | null>(null);
    // Expose the latest renderId to the listener closure without rebuilding
    // (and re-registering) the listener every time the id changes.
    const renderIdRef = useRef(renderId);
    renderIdRef.current = renderId;
    /**
     * Detach the currently-registered listener, if any, using the signal
     * name it was originally registered against.
     */
    const removeListener = () => {
        const entry = activeListenerRef.current;
        if (!entry) return;
        try {
            VegaViewServices.getView()?.removeSignalListener(
                entry.signalName,
                entry.listener
            );
        } catch {
            logDebug(
                `Listener for signal ${entry.signalName} could not be removed.`
            );
        }
        activeListenerRef.current = null;
    };
    /**
     * Register a fresh listener for the current signal name and store the
     * reference so future detachments can match it. Any previously-
     * registered listener is detached first to guarantee at most one
     * registration is active per component instance.
     */
    const addListener = () => {
        removeListener();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const listener = (name: string, value: any) => {
            setSignalValue(() => value);
            logDebug(
                `[${renderIdRef.current}] Signal value for ${name} has changed`,
                value
            );
        };
        try {
            VegaViewServices.getView()?.addSignalListener(signalName, listener);
            activeListenerRef.current = { signalName, listener };
        } catch {
            logDebug(`Listener for signal ${signalName} could not be added.`);
        }
    };
    /**
     * Re-attach the listener for the current signal. Equivalent to
     * `addListener()` (which is itself idempotent), kept as a named helper
     * for call-site clarity in the effects below.
     */
    const cycleListeners = () => {
        logDebug(`Cycling listeners for signal: ${signalName}...`);
        addListener();
    };
    const getSignalValues = useCallback(() => {
        try {
            const unpruned = VegaViewServices.getSignalByName(signalName);
            return computeSignalDisplay(unpruned, translate);
        } catch {
            logDebug(
                `Could not retrieve value for signal ${signalName}. It may not exist in the current view scope.`
            );
            return INVALID_SIGNAL_DISPLAY;
        }
    }, [signalName, translate]);
    /**
     * Ensure that listener is added/removed when the view changes between renders.
     */
    useEffect(() => {
        logDebug(`Render ID has changed to ${renderId}. Updating...`);
        cycleListeners();
        return () => {
            removeListener();
        };
    }, [renderId]);
    /**
     * Ensure that if the name changes (i.e. # of signals or a sort), then we update value and cycle listeners.
     */
    useEffect(() => {
        logDebug(
            `Signal name has changed from ${previousSignalName} to ${signalName}. Updating...`
        );
        setSignalValue(() => getSignalValues().display);
        cycleListeners();
        return () => {
            removeListener();
        };
    }, [signalName, getSignalValues]);
    // Only re-read the Vega view when something observably relevant has
    // changed: the signal name, the translator, or signalValue (the state
    // flag listener events flip to trigger a re-render for the current
    // signal). Unrelated render triggers no longer re-run the
    // prune/stringify pipeline on every pass.
    const currentValues = useMemo(
        () => getSignalValues(),
        [getSignalValues, signalValue]
    );
    logRender('SignalValue', {
        signalName,
        signalValue,
        viewValue: currentValues.display
    });
    return (
        <DataTableCell
            field={signalName}
            columnId='value'
            displayValue={currentValues.display}
            rawValue={currentValues.raw}
            valueType={currentValues.valueType}
            rowIndex={rowIndex}
            tooLong={currentValues.tooLong}
        />
    );
};
