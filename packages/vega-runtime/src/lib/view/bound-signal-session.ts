import type { View } from 'vega';

import {
    getSeedValues,
    type BoundSignal,
    type HeldBoundValue,
    type HeldBoundValues
} from '../spec-processing/bound-signals';
import { hasOwn } from '../spec-processing/object-guards';

export type BoundSignalSessionOptions = {
    /** A view that has completed its first run. */
    view: View;
    boundSignals: BoundSignal[];
    /** The held values at the moment of attaching. */
    heldValues: HeldBoundValues;
    /** Receives every value observed for a bound signal. */
    onValue: (name: string, held: HeldBoundValue) => void;
    /** Receives the error when a run started by a write fails. */
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

/**
 * Connect a set of bound signals to a view through the View API, which is
 * what Vega's own input binding is built on.
 *
 * On attaching, in this order:
 * 1. A held value that differs from the view's is written to the view. This
 *    applies input that arrived while no view was ready. Signals with an
 *    `update` expression are skipped, because the expression owns the value.
 * 2. The view's current value is reported for every bound signal.
 * 3. Every later change is reported, whatever causes it.
 */
export const attachBoundSignals = ({
    view,
    boundSignals,
    heldValues,
    onValue,
    onError
}: BoundSignalSessionOptions): BoundSignalSession => {
    const attached = boundSignals.filter((boundSignal) =>
        isKnownSignal(view, boundSignal.name)
    );
    let isDisposed = false;

    const run = () => {
        view.runAsync().catch((error: unknown) => onError?.(error));
    };

    const seedValues = getSeedValues(attached, heldValues);
    let hasAppliedHeldValue = false;
    for (const boundSignal of attached) {
        if (
            boundSignal.update !== undefined ||
            !hasOwn(seedValues, boundSignal.name)
        ) {
            continue;
        }
        const heldValue = seedValues[boundSignal.name];
        if (view.signal(boundSignal.name) !== heldValue) {
            view.signal(boundSignal.name, heldValue);
            hasAppliedHeldValue = true;
        }
    }
    if (hasAppliedHeldValue) {
        run();
    }

    for (const boundSignal of attached) {
        onValue(boundSignal.name, {
            key: boundSignal.key,
            value: view.signal(boundSignal.name)
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
        if (isDisposed) {
            return;
        }
        view.signal(name, value);
        run();
    };

    return {
        write: (name, value) => {
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
