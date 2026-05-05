import { type RefObject, useEffect } from 'react';

/**
 * Upper-bound timeout for the per-toggle viewport-match gate. Single
 * tunable for how long the gate stays pending after a viewer↔editor
 * toggle when the host's iframe doesn't reach the reported viewport
 * within the expected window. Shared between
 * `<RetainedDenebEditor />` and `<GatedDenebViewer />`.
 *
 * Set from observed cold-open iframe-expansion timing (~1500ms) plus
 * margin. On extreme slow-host scenarios the timer fires and the
 * underlying surface mounts at whatever size the iframe currently is
 * — strictly worse than a clean match release, but still better than
 * no gate.
 *
 * @internal
 */
export const VIEWPORT_SETTLE_TIMEOUT_MS = 3000;

/**
 * Stale-match bypass for the case where the host has already reported
 * the post-transition viewport before the gate engages — typically a
 * race where the host's `update()` viewport prop arrives in the same
 * render that flips the mode, so `startViewport` snapshots the
 * already-final value and a "viewport has changed since engage" check
 * never fires. After this many ms with `window.innerWidth` matching
 * the latest reported viewport, accept the match without requiring a
 * change-from-start. 150ms is well above a typical render commit and
 * well below the iframe-resize latency we are guarding against.
 *
 * @internal
 */
export const STALE_MATCH_BYPASS_MS = 150;

/**
 * Inputs to `computeGateMatch`, separated so the call site can pass
 * `undefined` viewports cleanly (Power BI only has the host viewport
 * available after the first `update()`).
 */
export type GateMatchInput = {
    /**
     * Host-reported viewport width at the moment the gate engaged.
     * Captured when `isPendingSettle` flips true. May be `undefined`
     * if the visual has not yet received any host update.
     */
    startWidth: number | undefined;
    /**
     * Latest host-reported viewport width at the moment of evaluation.
     */
    currentWidth: number | undefined;
    /**
     * Iframe interior width — `window.innerWidth`. Only the iframe's
     * actual physical size confirms that the host has paced through
     * its CSS resize.
     */
    iframeInnerWidth: number;
    /**
     * Milliseconds elapsed since gate engage.
     */
    elapsedMs: number;
    /**
     * Stale-match bypass window in ms. Past this point a width match
     * alone is sufficient even if the host has not reported a viewport
     * change since engage (covers the race where the post-transition
     * viewport was already reported before the gate engaged, and the
     * rare same-width viewer/editor case).
     */
    bypassMs: number;
};

/**
 * Predicate returning whether the per-toggle viewport-match gate
 * should release given the current measurements.
 *
 * Three guards combine:
 *   1. Width must be defined.
 *   2. The iframe interior width must equal the latest target
 *      viewport width — confirms the iframe has caught up to the
 *      expected size. The two gate sites use different sources for
 *      the target: `<RetainedDenebEditor>` compares against the
 *      live `options.viewport.width` (the editor-pane size we are
 *      expanding to), while `<GatedDenebViewer>` compares against
 *      `state.interface.embedViewport.width` (the canvas size the
 *      iframe is returning to in viewer mode). Picking the right
 *      target per direction is what makes strict equality reliable.
 *      (Height has a persistent ~36px chrome offset and is not a
 *      reliable equality signal at all.)
 *   3. Either the latest target differs from the engage snapshot
 *      (the host has paced through a transition), OR more than
 *      `bypassMs` has elapsed (stale-snapshot / same-width fallback).
 *
 * The latest-vs-start comparison is flap-safe by design: a host
 * that oscillates the target 800 → 805 → 800 will not falsely
 * release the gate when the latest value equals the engage value
 * while the iframe is still at 800.
 *
 * Precision normalization: `window.innerWidth` is integer per the
 * DOM spec, but `options.viewport.width` from Power BI can carry
 * sub-pixel precision (e.g., when snap-to-grid is off in the
 * report). Without normalization a host-reported `286.4729` would
 * never strictly-equal the iframe's `286`, the success path would
 * never fire, and the gate would always release via the safety
 * timer. All inputs are rounded to integers before comparison so
 * strict equality is semantically meaningful regardless of source
 * precision. Storage paths (`updates.ts` setting `embedViewport`)
 * also round at write time; the predicate's defensive rounding
 * covers callers that pass the live `options.viewport` directly.
 */
export const computeGateMatch = ({
    startWidth,
    currentWidth,
    iframeInnerWidth,
    elapsedMs,
    bypassMs
}: GateMatchInput): boolean => {
    if (currentWidth === undefined) return false;
    const iw = Math.round(iframeInnerWidth);
    const cw = Math.round(currentWidth);
    const sw = startWidth === undefined ? undefined : Math.round(startWidth);
    if (iw !== cw) return false;
    if (cw !== sw) return true;
    return elapsedMs > bypassMs;
};

/**
 * Shape of the viewport ref consumed by `useViewportMatchGate`. The
 * hook reads `current.w` on each evaluation tick so the parent can
 * keep updating the latest host-reported viewport without restarting
 * the effect (which would reset the engage snapshot and the upper-
 * bound timer).
 *
 * Only width participates in the predicate; height is carried for
 * symmetry with the parent's `viewportRef` shape but is not read by
 * the gate (height has a persistent ~36px chrome offset and is not a
 * reliable equality signal).
 */
export type ViewportRef = RefObject<{
    w: number | undefined;
    h: number | undefined;
}>;

/**
 * Inputs to `useViewportMatchGate`. Both `<RetainedDenebEditor />` and
 * `<GatedDenebViewer />` wire this hook with their per-toggle
 * `isPendingSettle` flag and a setter that releases the gate.
 */
export interface UseViewportMatchGateOptions {
    /**
     * Whether the gate is currently engaged. Each `false → true`
     * transition starts a fresh engage cycle (snapshot + timers); each
     * `true → false` transition (driven by the hook calling
     * `onSettled(false)`) tears the cycle down.
     */
    isPendingSettle: boolean;
    /**
     * Latest host-reported viewport, mutated in render by the parent.
     * The hook reads `current.w` on every tick.
     */
    viewportRef: ViewportRef;
    /**
     * Called with `false` when the gate releases, either via a
     * successful match or via the upper-bound safety timeout. The
     * caller's setter (typically `setIsPendingSettle`) clears the
     * `isPendingSettle` flag, which in turn lets this effect tear
     * down on its next run.
     */
    onSettled: (settled: false) => void;
    /**
     * Stale-match bypass window in ms. Defaults to
     * `STALE_MATCH_BYPASS_MS`.
     */
    bypassMs?: number;
    /**
     * Upper-bound safety timeout in ms. Defaults to
     * `VIEWPORT_SETTLE_TIMEOUT_MS`.
     */
    timeoutMs?: number;
}

/**
 * Per-toggle viewport-match gate. Used by both
 * `<RetainedDenebEditor />` (gates editor visibility while the iframe
 * expands on viewer→editor) and `<GatedDenebViewer />` (gates viewer
 * mount while the iframe shrinks on editor→viewer).
 *
 * Each time `isPendingSettle` flips true, the effect:
 *   1. Snapshots the current host viewport (the engage value).
 *   2. Records the engage timestamp.
 *   3. Starts a `resize` listener, a 100ms interval poll, and a
 *      `timeoutMs` upper-bound safety timer.
 *
 * The poll exists because the host viewport prop can change without
 * firing a `window.resize` event. 100ms granularity is well below
 * the iframe-resize latency we are detecting (~52ms warm shrink,
 * ~1500ms cold expand) without coupling the effect's deps to the
 * viewport (which would reset the engage snapshot and timer on every
 * host update).
 *
 * On a successful match the hook calls `onSettled(false)`. The
 * `cancelled` flag is set synchronously alongside that call so any
 * in-flight tick (queued resize event, interval poll mid-burst) that
 * runs before React processes the state update exits cleanly instead
 * of calling `onSettled(false)` again.
 */
export const useViewportMatchGate = ({
    isPendingSettle,
    viewportRef,
    onSettled,
    bypassMs = STALE_MATCH_BYPASS_MS,
    timeoutMs = VIEWPORT_SETTLE_TIMEOUT_MS
}: UseViewportMatchGateOptions): void => {
    useEffect(() => {
        if (!isPendingSettle) return;
        if (typeof window === 'undefined') {
            onSettled(false);
            return;
        }

        const startViewport = {
            w: viewportRef.current?.w,
            h: viewportRef.current?.h
        };
        const engagedAt =
            typeof performance !== 'undefined' &&
            typeof performance.now === 'function'
                ? performance.now()
                : Date.now();
        let cancelled = false;

        const nowMs = (): number =>
            typeof performance !== 'undefined' &&
            typeof performance.now === 'function'
                ? performance.now()
                : Date.now();

        const matches = (): boolean =>
            computeGateMatch({
                startWidth: startViewport.w,
                currentWidth: viewportRef.current?.w,
                iframeInnerWidth: window.innerWidth,
                elapsedMs: nowMs() - engagedAt,
                bypassMs
            });

        const trySettle = () => {
            if (cancelled) return;
            if (matches()) {
                cancelled = true;
                onSettled(false);
            }
        };

        trySettle();

        window.addEventListener('resize', trySettle);

        const pollIntervalId = window.setInterval(trySettle, 100);

        const upperBoundId = window.setTimeout(() => {
            if (!cancelled) {
                cancelled = true;
                onSettled(false);
            }
        }, timeoutMs);

        return () => {
            cancelled = true;
            window.removeEventListener('resize', trySettle);
            window.clearInterval(pollIntervalId);
            window.clearTimeout(upperBoundId);
        };
        // The hook is intentionally keyed only on `isPendingSettle`.
        // The viewport ref is read fresh on every tick, and `onSettled`
        // / `bypassMs` / `timeoutMs` are expected to be stable across
        // renders. Coupling deps to the viewport would reset the
        // engage snapshot and the upper-bound timer on every host
        // update, breaking the change-from-start guard.
    }, [isPendingSettle]);
};
