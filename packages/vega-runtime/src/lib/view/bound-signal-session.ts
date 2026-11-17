import type { View } from 'vega';

import {
    getApplicableHeldValues,
    type BoundSignal,
    type HeldBoundValue,
    type HeldBoundValues
} from '../spec-processing/bound-signals';
import { hasOwn } from '../spec-processing/object-guards';

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

/**
 * `View.runAsync` with the `prerun` callback that Vega documents and
 * implements. Vega's type declarations give the method no parameters.
 */
type RunAsyncWithPrerun = (
    this: View,
    encode: string | undefined,
    prerun: () => void
) => Promise<View>;

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

/** Room around the plot, in pixels, on each side. */
type RoomAroundPlot = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

/**
 * The part of the scenegraph this module reads. Vega's type declarations
 * give `view.scenegraph()` the type of the root scene, but it returns the
 * scenegraph, whose `root` is that scene.
 */
type ScenegraphWithRoot = {
    root: { bounds: { x1: number; y1: number; x2: number; y2: number } };
};

/**
 * The room the drawn content needs around the plot, measured as Vega's
 * autosize layout measures it: how far the bounds of everything drawn reach
 * beyond the plot on each side.
 */
const getRoomNeeded = (view: View): RoomAroundPlot => {
    const { bounds } = (view.scenegraph() as unknown as ScenegraphWithRoot)
        .root;
    return {
        left: Math.max(0, Math.ceil(-bounds.x1)),
        top: Math.max(0, Math.ceil(-bounds.y1)),
        right: Math.max(0, Math.ceil(bounds.x2 - view.width())),
        bottom: Math.max(0, Math.ceil(bounds.y2 - view.height()))
    };
};

const isSameRoom = (a: RoomAroundPlot, b: RoomAroundPlot): boolean =>
    a.left === b.left &&
    a.top === b.top &&
    a.right === b.right &&
    a.bottom === b.bottom;

const fitsWithin = (needed: RoomAroundPlot, given: RoomAroundPlot): boolean =>
    needed.left <= given.left &&
    needed.top <= given.top &&
    needed.right <= given.right &&
    needed.bottom <= given.bottom;

/**
 * The most layout passes one write may cause. One is usual and two is
 * sometimes needed; the limit stops a layout that never settles.
 */
const MAX_LAYOUT_PASSES = 3;

/**
 * Recompute the view's autosize layout when a write has changed how much
 * room the drawn content needs.
 *
 * Vega lays a view out on its first run and does not revisit the layout when
 * a signal changes what is drawn, so a new value can leave part of the chart
 * outside a view of fixed size. A layout pass gives the content exactly the
 * room it needs at that moment and then redraws at the new plot size, which
 * can change the room needed again. So the pass is repeated until the
 * content needs no more than it was given.
 *
 * A write that leaves the room needed unchanged causes no pass. That keeps a
 * layout Vega cannot settle from moving on every write.
 */
const fitLayoutToContent = async (
    view: View,
    roomNeededBeforeWrite: RoomAroundPlot
): Promise<void> => {
    if (isSameRoom(getRoomNeeded(view), roomNeededBeforeWrite)) {
        return;
    }
    for (let pass = 0; pass < MAX_LAYOUT_PASSES; pass += 1) {
        const roomGiven = getRoomNeeded(view);
        await view.resize().runAsync();
        if (fitsWithin(getRoomNeeded(view), roomGiven)) {
            return;
        }
    }
};

/**
 * Set signals at the start of the view's next run, as Vega's own input
 * binding does. A signal set while a run is paused on an asynchronous
 * operator, such as a data load, can be missed by that run.
 *
 * When that run has finished, the layout is fitted to what is now drawn.
 * That follows the run and is not part of it, because a Vega-Lite selection
 * changes the chart one run after its signal changes.
 */
const setSignalsInNextRun = (
    view: View,
    setSignals: () => void,
    onError: ((error: unknown) => void) | undefined
) => {
    let roomNeededBeforeWrite: RoomAroundPlot | undefined;
    (view.runAsync as RunAsyncWithPrerun)
        .call(view, undefined, () => {
            roomNeededBeforeWrite = getRoomNeeded(view);
            setSignals();
        })
        .then(() =>
            roomNeededBeforeWrite === undefined
                ? undefined
                : fitLayoutToContent(view, roomNeededBeforeWrite)
        )
        .catch((error: unknown) => onError?.(error));
};

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
        setSignalsInNextRun(
            view,
            () => writeSignals(view, heldValuesToWrite),
            onError
        );
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
            onError
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
