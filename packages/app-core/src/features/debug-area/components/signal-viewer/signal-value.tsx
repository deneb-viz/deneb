import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePrevious } from '@uidotdev/usehooks';
import { type View } from 'vega';

import { logDebug, logRender } from '@deneb-viz/utils/logging';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { DataTableCell } from '../data-table/data-table-cell';
import { useDenebState } from '../../../../state';
import {
    computeSignalDisplay,
    INVALID_SIGNAL_DISPLAY
} from './signal-value-utils';
import {
    attachSignalListener,
    detachSignalListener,
    type ActiveSignalListener
} from './signal-listener';

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
 * The listener used to call `setSignalValue(() => value)` directly with the raw value Vega handed back. `useState`
 * bails out of the re-render via `Object.is(next, prev)` — fine for primitives, but Vega signals backed by an object
 * or array can be mutated in place and re-emitted under the SAME reference (e.g. a signal whose value is a shared
 * data-derived object). `Object.is` then reports "unchanged" even though the content did change, the state update is
 * dropped, and the cell shows a stale value until some unrelated re-render happens to occur. The listener now wraps
 * the incoming value in a fresh `{ value }` object on every emit (see below) so the reference is always new and the
 * triggering re-render always fires, regardless of what Vega does with the underlying value's identity.
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
    const activeListenerRef = useRef<ActiveSignalListener>(null);
    // Expose the latest renderId to the listener closure without rebuilding
    // (and re-registering) the listener every time the id changes.
    const renderIdRef = useRef(renderId);
    renderIdRef.current = renderId;
    /**
     * Detach the currently-registered listener, if any, using the signal
     * name it was originally registered against.
     */
    const removeListener = (view: View | null) => {
        const entry = activeListenerRef.current;
        if (!entry) return;
        try {
            detachSignalListener(view, entry);
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
    const addListener = (view: View | null) => {
        removeListener(view);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const listener = (name: string, value: any) => {
            // Wrap in a fresh object on every emit rather than passing
            // `value` straight through. Vega signals backed by an object or
            // array can be mutated in place and re-emitted under the SAME
            // reference; `useState`'s `Object.is` bail-out would then treat
            // a real content change as a no-op and skip the re-render that
            // drives this cell's display. The wrapper is always a new
            // reference, so the triggering re-render always fires. See the
            // `@privateRemarks` above for the full rationale.
            setSignalValue(() => ({ value }));
            logDebug(
                `[${renderIdRef.current}] Signal value for ${name} has changed`,
                value
            );
        };
        try {
            activeListenerRef.current = attachSignalListener(
                view,
                signalName,
                listener
            );
        } catch {
            logDebug(`Listener for signal ${signalName} could not be added.`);
        }
    };
    /**
     * Re-attach the listener for the current signal. Equivalent to
     * `addListener()` (which is itself idempotent), kept as a named helper
     * for call-site clarity in the effects below.
     */
    const cycleListeners = (view: View | null) => {
        logDebug(`Cycling listeners for signal: ${signalName}...`);
        addListener(view);
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
        // Capture the view live at effect entry so cleanup detaches from the
        // SAME instance even after a view replacement bumps the singleton.
        const viewAtEntry = VegaViewServices.getView();
        logDebug(`Render ID has changed to ${renderId}. Updating...`);
        cycleListeners(viewAtEntry);
        return () => {
            removeListener(viewAtEntry);
        };
    }, [renderId]);
    /**
     * Ensure that if the name changes (i.e. # of signals or a sort), then we update value and cycle listeners.
     */
    useEffect(() => {
        const viewAtEntry = VegaViewServices.getView();
        logDebug(
            `Signal name has changed from ${previousSignalName} to ${signalName}. Updating...`
        );
        setSignalValue(() => getSignalValues().display);
        cycleListeners(viewAtEntry);
        return () => {
            removeListener(viewAtEntry);
        };
    }, [signalName, getSignalValues]);
    // Re-read on signalName/translator change (via getSignalValues
    // identity), listener-fired updates (signalValue), or view replacement
    // (renderId - component instances outlive the View, so a fresh
    // renderId means the memoised display is from a stale View).
    const currentValues = useMemo(
        () => getSignalValues(),
        [getSignalValues, signalValue, renderId]
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
