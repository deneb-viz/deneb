import type { View } from 'vega';

/**
 * Fits a view's layout to what is drawn after a signal is written: measures the
 * room the drawn content needs around the plot and, once a burst of writes has
 * changed it, runs layout passes until the content fits.
 */

/**
 * `View.runAsync` with the `prerun` callback that Vega documents and
 * implements. Vega's type declarations give the method no parameters.
 */
type RunAsyncWithPrerun = (
    this: View,
    encode: string | undefined,
    prerun: () => void
) => Promise<View>;

/** Room around the plot, in pixels, on each side. */
type RoomAroundPlot = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

/** A rectangle in the scenegraph, in pixels from the plot's top left. */
type SceneBounds = { x1: number; y1: number; x2: number; y2: number };

/** A legend, as the item of its legend mark. */
type SceneLegend = { bounds: SceneBounds; orient?: string };

/** A mark in the top-level group: an axis, legend, title or mark. */
type SceneMark = { role?: string; bounds: SceneBounds; items: SceneLegend[] };

/** The group that holds everything drawn around and on the plot. */
type SceneTopLevelGroup = { clip?: boolean; items: SceneMark[] };

/**
 * The parts of the scenegraph that Vega's layout reads. Vega's type
 * declarations give `view.scenegraph()` the type of the root scene, but it
 * returns the scenegraph, whose `root` is that scene: a mark whose one item
 * is the top-level group.
 */
type LayoutScenegraph = { root: { items: SceneTopLevelGroup[] } };

/** The autosize types for which Vega counts a legend only across the plot. */
const FIT_AUTOSIZE_TYPES: ReadonlySet<string | undefined> = new Set([
    'fit',
    'fit-x',
    'fit-y'
]);

/** The `type` of the view's autosize, such as `pad`, `fit` or `none`. */
const getAutosizeType = (view: View): string | undefined =>
    (view.signal('autosize') as { type?: string } | undefined)?.type;

const includeHorizontally = (reach: SceneBounds, bounds: SceneBounds) => {
    reach.x1 = Math.min(reach.x1, bounds.x1);
    reach.x2 = Math.max(reach.x2, bounds.x2);
};

const includeVertically = (reach: SceneBounds, bounds: SceneBounds) => {
    reach.y1 = Math.min(reach.y1, bounds.y1);
    reach.y2 = Math.max(reach.y2, bounds.y2);
};

/**
 * The room the drawn content needs around the plot, measured as Vega's
 * autosize layout measures it.
 *
 * This follows `layoutGroup` in `vega-view-transforms/src/ViewLayout.js`.
 * Check it against that function whenever Vega is upgraded.
 *
 * The content reaches at least across the plot, and each mark in the
 * top-level group extends that reach by its bounds. The root group's own
 * stroke is not counted. A legend is the exception: when the view fits its
 * size, a legend on the left or right extends the reach only horizontally,
 * one on the top or bottom only vertically, and one anywhere else not at
 * all, so a legend taller than the plot does not squeeze it. A clipped
 * top-level group needs no room, and neither does a view with nothing drawn.
 */
const getRoomNeeded = (view: View): RoomAroundPlot => {
    const { root } = view.scenegraph() as unknown as LayoutScenegraph;
    const [topLevelGroup] = root.items;
    if (topLevelGroup === undefined || topLevelGroup.clip) {
        return { left: 0, top: 0, right: 0, bottom: 0 };
    }
    const isFitted = FIT_AUTOSIZE_TYPES.has(getAutosizeType(view));
    const reach: SceneBounds = {
        x1: 0,
        y1: 0,
        x2: view.width(),
        y2: view.height()
    };
    for (const mark of topLevelGroup.items) {
        if (mark.role !== 'legend') {
            includeHorizontally(reach, mark.bounds);
            includeVertically(reach, mark.bounds);
            continue;
        }
        const [legend] = mark.items;
        if (legend === undefined) {
            continue;
        }
        if (!isFitted) {
            includeHorizontally(reach, legend.bounds);
            includeVertically(reach, legend.bounds);
        } else if (legend.orient === 'left' || legend.orient === 'right') {
            includeHorizontally(reach, legend.bounds);
        } else if (legend.orient === 'top' || legend.orient === 'bottom') {
            includeVertically(reach, legend.bounds);
        }
    }
    return {
        left: Math.max(0, Math.ceil(-reach.x1)),
        top: Math.max(0, Math.ceil(-reach.y1)),
        right: Math.max(0, Math.ceil(reach.x2 - view.width())),
        bottom: Math.max(0, Math.ceil(reach.y2 - view.height()))
    };
};

/**
 * The room the drawn content needs around the plot, or `undefined` when it
 * cannot be measured. A measurement is taken inside a run, where an error
 * would stop the run's signals from being set, so it must never throw.
 */
const measureRoomNeeded = (view: View): RoomAroundPlot | undefined => {
    try {
        return getRoomNeeded(view);
    } catch {
        return undefined;
    }
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
 * The most layout passes one fit may run. One is usual and two is sometimes
 * needed; the limit stops a layout that never settles.
 */
const MAX_LAYOUT_PASSES = 3;

/**
 * Writes to one view whose layout is fitted together, once the last of them
 * has finished. A burst starts with a write queued while no burst is open,
 * and ends when the fit after its last write ends.
 */
type WriteBurst = {
    /** Writes queued for the view whose runs have not finished. */
    unfinishedWrites: number;
    /** Whether the run of the burst's first write has measured the room. */
    isRoomMeasured: boolean;
    /**
     * The room the content needed before the burst's first write, or
     * `undefined` if it could not be measured. Then no layout pass follows.
     */
    roomNeededBefore: RoomAroundPlot | undefined;
    /**
     * Whether a layout pass has run in this burst. The layout then no longer
     * matches the room needed before the burst, so the fit that ends the
     * burst runs whether or not that room has changed.
     */
    hasLayoutPassRun: boolean;
    /** Whether a fit is running, so that no second fit starts beside it. */
    isFitting: boolean;
};

/**
 * The open burst of writes for each view. It is kept per view, not per
 * session, because a session, a session attached after it and
 * `applyHeldBoundValues` can all write to the same view.
 */
const writeBursts = new WeakMap<View, WriteBurst>();

/** Count a newly queued write in the view's open burst, or open one. */
const joinWriteBurst = (view: View): WriteBurst => {
    const burst = writeBursts.get(view) ?? {
        unfinishedWrites: 0,
        isRoomMeasured: false,
        roomNeededBefore: undefined,
        hasLayoutPassRun: false,
        isFitting: false
    };
    burst.unfinishedWrites += 1;
    writeBursts.set(view, burst);
    return burst;
};

const endWriteBurst = (view: View, burst: WriteBurst) => {
    if (writeBursts.get(view) === burst) {
        writeBursts.delete(view);
    }
};

/**
 * Whether the fit that follows a burst needs a layout pass: autosize can give
 * room, and either a pass has already run in the burst or the room the
 * content needs has changed since before the burst's first write.
 *
 * A burst that leaves the room needed as it was causes no pass. That keeps a
 * layout Vega cannot settle from moving on every write.
 */
const needsLayoutPass = (view: View, burst: WriteBurst): boolean => {
    if (burst.hasLayoutPassRun) {
        return true;
    }
    if (
        burst.roomNeededBefore === undefined ||
        getAutosizeType(view) === 'none'
    ) {
        return false;
    }
    const roomNeeded = measureRoomNeeded(view);
    return (
        roomNeeded !== undefined &&
        !isSameRoom(roomNeeded, burst.roomNeededBefore)
    );
};

/**
 * Recompute the view's autosize layout after the last write of a burst, when
 * the burst has changed how much room the drawn content needs.
 *
 * Vega lays a view out on its first run and does not revisit the layout when
 * a signal changes what is drawn, so a new value can leave part of the chart
 * outside a view of fixed size. A layout pass gives the content exactly the
 * room it needs at that moment and then redraws at the new plot size, which
 * can change the room needed again. So the pass is repeated until the
 * content needs no more than it was given.
 *
 * The fit stops without another pass once `isStopped` returns true. When a
 * write is queued for the view while a pass runs, the fit leaves the burst
 * open for that write, which finishes the fit when its own run is done.
 */
const fitLayoutAfterBurst = async (
    view: View,
    burst: WriteBurst,
    isStopped: () => boolean
): Promise<void> => {
    if (!needsLayoutPass(view, burst)) {
        endWriteBurst(view, burst);
        return;
    }
    burst.isFitting = true;
    try {
        for (let pass = 0; pass < MAX_LAYOUT_PASSES; pass += 1) {
            if (isStopped()) {
                break;
            }
            // A pass gives the content the room it needs as the pass starts.
            const roomGiven = measureRoomNeeded(view);
            if (roomGiven === undefined) {
                break;
            }
            await view.resize().runAsync();
            burst.hasLayoutPassRun = true;
            if (burst.unfinishedWrites > 0) {
                // The queued write finishes the fit once its run is done.
                return;
            }
            const roomNeeded = measureRoomNeeded(view);
            if (roomNeeded === undefined || fitsWithin(roomNeeded, roomGiven)) {
                break;
            }
        }
        endWriteBurst(view, burst);
    } finally {
        burst.isFitting = false;
    }
};

/**
 * Set signals at the start of the view's next run, as Vega's own input
 * binding does, and then fit the layout to what is drawn. A signal set while
 * a run is paused on an asynchronous operator, such as a data load, can be
 * missed by that run.
 *
 * The layout is fitted after the run and not as part of it, because a
 * Vega-Lite selection changes the chart one run after its signal changes.
 * When another write to the view is queued by the time this one's run has
 * finished, the fit is left to the last write of the burst. A run that fails
 * leaves the burst open, so the next write's fit covers this one.
 */
const writeInNextRun = async (
    view: View,
    setSignals: () => void,
    isStopped: () => boolean
): Promise<void> => {
    const burst = joinWriteBurst(view);
    try {
        await (view.runAsync as RunAsyncWithPrerun).call(
            view,
            undefined,
            () => {
                if (!burst.isRoomMeasured) {
                    burst.isRoomMeasured = true;
                    burst.roomNeededBefore = measureRoomNeeded(view);
                }
                setSignals();
            }
        );
    } finally {
        burst.unfinishedWrites -= 1;
    }
    if (burst.unfinishedWrites === 0 && !burst.isFitting) {
        await fitLayoutAfterBurst(view, burst, isStopped);
    }
};

type SetSignalsInNextRunOptions = {
    /** Receives a rejection from the write's run or a layout pass. */
    onError: ((error: unknown) => void) | undefined;
    /** Returns true once no further layout pass may start. */
    isStopped: () => boolean;
};

/** `writeInNextRun`, without waiting for it. */
export const setSignalsInNextRun = (
    view: View,
    setSignals: () => void,
    { onError, isStopped }: SetSignalsInNextRunOptions
) => {
    writeInNextRun(view, setSignals, isStopped).catch((error: unknown) =>
        onError?.(error)
    );
};
