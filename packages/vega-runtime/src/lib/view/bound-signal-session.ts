import type { View } from 'vega';

import {
    getApplicableHeldValues,
    type BoundSignal,
    type HeldBoundValue,
    type HeldBoundValues
} from '../spec-processing/bound-signals';
import { hasOwn } from '../spec-processing/object-guards';
import { setSignalsInNextRun } from './layout-fit';

export type ApplyHeldBoundValuesOptions = {
    /** A view that has completed its first run. */
    view: View;
    /** The bound signals the view was built from. */
    boundSignals: BoundSignal[];
    heldValues: HeldBoundValues;
    /**
     * Receives a rejection from the run that writes the values. Vega reports
     * a failed run through the view's logger and still resolves, so this is
     * only reached by a failure Vega does not handle.
     */
    onError?: (error: unknown) => void;
};

export type BoundSignalSessionOptions = {
    /** A view that has completed its first run. */
    view: View;
    boundSignals: BoundSignal[];
    /** The held values at the moment of attaching. */
    heldValues: HeldBoundValues;
    /** Receives every value observed for a bound signal. */
    onValue: (name: string, held: HeldBoundValue) => void;
    /**
     * Receives a rejection from a run that a write started. Vega reports a
     * failed run through the view's logger and still resolves, so this is
     * only reached by a failure Vega does not handle.
     */
    onError?: (error: unknown) => void;
};

export type BoundSignalSession = {
    /** Write a control's value to the view, after the binding's debounce. */
    write: (name: string, value: unknown) => void;
    /** Stop listening and drop pending writes. The view is left alone. */
    dispose: () => void;
};

const isKnownSignal = (view: View, name: string): boolean => {
    try {
        view.signal(name);
        return true;
    } catch {
        return false;
    }
};

/** The bound signals that the view has. */
const getKnownBoundSignals = (
    view: View,
    boundSignals: BoundSignal[]
): BoundSignal[] =>
    boundSignals.filter((boundSignal) => isKnownSignal(view, boundSignal.name));

/**
 * The held values to write to a view, by signal name: those captured under
 * the current definitions that differ from the view's own values. Signals
 * with an `update` expression are skipped, because the expression owns the
 * value. Every bound signal passed must be one the view has.
 */
const getHeldValuesToWrite = (
    view: View,
    knownBoundSignals: BoundSignal[],
    heldValues: HeldBoundValues
): Map<string, unknown> => {
    const applicableHeldValues = getApplicableHeldValues(
        knownBoundSignals,
        heldValues
    );
    const heldValuesToWrite = new Map<string, unknown>();
    for (const boundSignal of knownBoundSignals) {
        if (
            boundSignal.update !== undefined ||
            !hasOwn(applicableHeldValues, boundSignal.name)
        ) {
            continue;
        }
        const heldValue = applicableHeldValues[boundSignal.name];
        if (!Object.is(view.signal(boundSignal.name), heldValue)) {
            heldValuesToWrite.set(boundSignal.name, heldValue);
        }
    }
    return heldValuesToWrite;
};

const writeSignals = (view: View, values: Map<string, unknown>) => {
    values.forEach((value, name) => {
        view.signal(name, value);
    });
};

/**
 * Write the held values to a view, all in one run that sets them at its
 * start. Only a value that differs from the view's own is written, so no run
 * is started when nothing differs. Signals the view does not have and
 * signals with an `update` expression are skipped.
 *
 * Call this straight after the view's first run. Held values are never
 * seeded into the spec instead, because Vega skips signal-triggered handlers
 * on a view's first run: a seeded Vega-Lite selection would show one value
 * in its control and filter by another.
 */
export const applyHeldBoundValues = ({
    view,
    boundSignals,
    heldValues,
    onError
}: ApplyHeldBoundValuesOptions): void => {
    const heldValuesToWrite = getHeldValuesToWrite(
        view,
        getKnownBoundSignals(view, boundSignals),
        heldValues
    );
    if (heldValuesToWrite.size > 0) {
        setSignalsInNextRun(view, () => writeSignals(view, heldValuesToWrite), {
            onError,
            isStopped: () => false
        });
    }
};

/**
 * Connect a set of bound signals to a view through the View API, which is
 * what Vega's own input binding is built on.
 *
 * On attaching, in this order:
 * 1. A held value that differs from the view's is queued for the view, by
 *    the same rule as `applyHeldBoundValues`. This applies input that
 *    arrived after the view was embedded but before it was attached.
 * 2. A value is reported for every bound signal: its queued held value, or
 *    otherwise the view's current value.
 * 3. Every later change is reported, whatever causes it.
 *
 * Every write sets its signals at the start of a run, as Vega's own input
 * binding does. A signal set while a run is paused on an asynchronous
 * operator, such as a data load, can be missed by that run.
 */
export const attachBoundSignals = ({
    view,
    boundSignals,
    heldValues,
    onValue,
    onError
}: BoundSignalSessionOptions): BoundSignalSession => {
    const attached = getKnownBoundSignals(view, boundSignals);
    let isDisposed = false;

    const setInNextRun = (setSignals: () => void) => {
        setSignalsInNextRun(
            view,
            () => {
                if (!isDisposed) {
                    setSignals();
                }
            },
            { onError, isStopped: () => isDisposed }
        );
    };

    const queuedHeldValues = getHeldValuesToWrite(view, attached, heldValues);
    if (queuedHeldValues.size > 0) {
        setInNextRun(() => writeSignals(view, queuedHeldValues));
    }

    for (const boundSignal of attached) {
        onValue(boundSignal.name, {
            key: boundSignal.key,
            value: queuedHeldValues.has(boundSignal.name)
                ? queuedHeldValues.get(boundSignal.name)
                : view.signal(boundSignal.name)
        });
    }

    const listeners = attached.map((boundSignal) => {
        const listener = (_name: string, value: unknown) => {
            onValue(boundSignal.name, { key: boundSignal.key, value });
        };
        view.addSignalListener(boundSignal.name, listener);
        return { name: boundSignal.name, listener };
    });

    const debounceByName = new Map(
        attached.map((boundSignal) => [
            boundSignal.name,
            Number(boundSignal.bind.debounce) || 0
        ])
    );
    const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();

    const writeNow = (name: string, value: unknown) => {
        setInNextRun(() => {
            view.signal(name, value);
        });
    };

    return {
        write: (name, value) => {
            // Only an attached bound signal has a debounce entry.
            const delay = debounceByName.get(name);
            if (isDisposed || delay === undefined) {
                return;
            }
            if (delay <= 0) {
                writeNow(name, value);
                return;
            }
            clearTimeout(pendingWrites.get(name));
            pendingWrites.set(
                name,
                setTimeout(() => {
                    pendingWrites.delete(name);
                    writeNow(name, value);
                }, delay)
            );
        },
        dispose: () => {
            isDisposed = true;
            pendingWrites.forEach((timer) => clearTimeout(timer));
            pendingWrites.clear();
            listeners.forEach(({ name, listener }) =>
                view.removeSignalListener(name, listener)
            );
        }
    };
};
