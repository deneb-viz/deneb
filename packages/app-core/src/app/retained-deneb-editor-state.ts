/**
 * Upper-bound timeout for the per-toggle viewport-match gate. Single
 * tunable for how long the gate stays pending after a viewer↔editor
 * toggle when the host's iframe doesn't reach the reported viewport
 * within the expected window. Shared between
 * `<RetainedDenebEditor />` and `<RetainedDenebViewer />`.
 *
 * Set from observed cold-open iframe-expansion timing (~1500ms) plus
 * margin. On extreme slow-host scenarios the timer fires and the
 * underlying surface mounts at whatever size the iframe currently is
 * — strictly worse than a clean match release, but still better than
 * no gate.
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
 */
export const STALE_MATCH_BYPASS_MS = 150;

/**
 * Pure retention-state computation shared between
 * `<RetainedDenebEditor />` and its tests.
 *
 * Lives in a separate file from the component so the test file does
 * not transitively pull in Monaco (which needs a browser `window`).
 *
 * Returns two values:
 *   - shouldRender: whether `<DenebEditor />` should be in the DOM at all
 *   - isVisible:    whether it should be `display: flex` (else `display: none`)
 *
 * The shouldRender output also encodes the latch: the helper reports
 * `shouldRender = true` from the first call where `isEditorMode` is
 * true onwards, even when the caller has already retained that state
 * via its own `useState`. The component manages the actual latch via
 * `useState` for concurrent-mode safety; this helper is the pure
 * decision function.
 */
export const computeRetentionState = (
    hasOpenedOnce: boolean,
    isEditorMode: boolean
): {
    shouldRender: boolean;
    isVisible: boolean;
} => ({
    shouldRender: hasOpenedOnce || isEditorMode,
    isVisible: isEditorMode
});

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
 *   2. The iframe interior width must equal the latest host-reported
 *      viewport width — confirms the iframe has caught up to host
 *      intent (height has a persistent ~36px chrome offset and is
 *      not a reliable equality signal).
 *   3. Either the latest viewport differs from the engage snapshot
 *      (the host has paced through a transition), OR more than
 *      `bypassMs` has elapsed (stale-snapshot / same-width fallback).
 *
 * The latest-vs-start comparison is flap-safe by design: a host that
 * oscillates `viewport.width` 800 → 805 → 800 will not falsely
 * release the gate when the latest value equals the engage value
 * while the iframe is still pre-expansion at 800.
 */
export const computeGateMatch = ({
    startWidth,
    currentWidth,
    iframeInnerWidth,
    elapsedMs,
    bypassMs
}: GateMatchInput): boolean => {
    if (currentWidth === undefined) return false;
    if (iframeInnerWidth !== currentWidth) return false;
    if (currentWidth !== startWidth) return true;
    return elapsedMs > bypassMs;
};
