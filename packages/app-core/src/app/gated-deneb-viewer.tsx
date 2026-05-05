import { type ReactNode, useRef, useState } from 'react';

import { useViewportMatchGate } from './viewport-match-gate-state';

interface GatedDenebViewerProps {
    /**
     * `true` exactly when the visual's display mode is `'viewer'`.
     */
    isViewerMode: boolean;
    /**
     * `true` exactly when the visual's display mode is `'editor'`.
     * Drives the `hasBeenInEditor` latch — only viewer-mode entries
     * AFTER an editor session in the same visual instance need the
     * gate, so cold-load viewer mounts (no editor history) take the
     * fast path with no gate-pending delay.
     */
    isEditorMode: boolean;
    /**
     * Host-reported viewport width from `VisualUpdateOptions`. The
     * match-based gate releases when `window.innerWidth` equals this
     * value AND it has changed since the gate engaged — meaning the
     * Power BI host has both told us the new size and physically
     * resized the iframe to match. Undefined before the first update.
     */
    hostViewportWidth: number | undefined;
    /**
     * Host-reported viewport height from `VisualUpdateOptions`. See
     * `hostViewportWidth` for semantics. Carried for parity with
     * `<RetainedDenebEditor>` even though only width is used by the
     * gate predicate (height has a persistent ~36px chrome offset
     * and is not a reliable equality signal).
     */
    hostViewportHeight: number | undefined;
    /**
     * The viewer subtree to mount when the gate is released. Held
     * back until `iw === vw` for the new viewer-mode width.
     */
    children: ReactNode;
}

/**
 * Pure decision: should the per-toggle viewport-match gate engage on
 * a viewer-mode edge?
 *
 * The gate only makes sense AFTER the user has opened the editor at
 * least once in the session. Before that there is no host-paced
 * shrink to wait for, so a cold-load viewer mount should take the
 * fast path with no gate-pending delay.
 *
 * Returns `true` exactly on the false→true edge of `isViewerMode`
 * AND when `hasBeenInEditor` is set. The viewer→editor disengage
 * direction is handled by the caller (`computeViewerGateEngage` does
 * not concern itself with the false branch — engage is the only
 * decision the helper covers).
 */
export const computeViewerGateEngage = (
    previousIsViewerMode: boolean,
    isViewerMode: boolean,
    hasBeenInEditor: boolean
): boolean =>
    previousIsViewerMode !== isViewerMode && isViewerMode && hasBeenInEditor;

/**
 * Gates the viewer subtree's mount on the iframe physically reaching
 * the host-reported viewport width when the user transitions from
 * editor mode back to viewer mode. Mirrors `<RetainedDenebEditor>`'s
 * match-based gate on the opposite (shrinking) direction.
 *
 * The component itself is not retained — every viewer-mode entry
 * remounts the children fresh. Symmetric retention is the right long-
 * term shape (per the parent brainstorm) but a much larger routing
 * rewrite. The mount gate is surgical, removes the visible bounce,
 * and is compatible with later layering retention on top — at which
 * point this gate becomes redundant and can be removed.
 *
 * Behaviour summary:
 *  - Cold load (no editor opened in this session yet): renders
 *    children as soon as `isViewerMode` is true. No gate, no delay.
 *  - On every viewer-mode entry AFTER the first editor open: holds
 *    the children unmounted until either:
 *      a) `window.innerWidth` matches the latest `hostViewportWidth`
 *         AND the host viewport has changed since the gate engaged
 *         (proving the host has paced through its shrink), OR
 *      b) `STALE_MATCH_BYPASS_MS` has elapsed with the width matching
 *         (covers the race where the post-transition viewport was
 *         already reported before the gate engaged — common on the
 *         editor → viewer direction since the host typically reports
 *         the new smaller `viewport.width` in the same `update()`
 *         that flips mode), OR
 *      c) `VIEWPORT_SETTLE_TIMEOUT_MS` has elapsed (safety net).
 *  - When `isViewerMode` is false: renders nothing.
 */
export const GatedDenebViewer = ({
    isViewerMode,
    isEditorMode,
    hostViewportWidth,
    hostViewportHeight,
    children
}: GatedDenebViewerProps) => {
    // Latch — once the editor has been opened in this session, every
    // subsequent viewer-mode entry needs the gate. State (not a ref)
    // for concurrent-mode safety, mirroring `RetainedDenebEditor`'s
    // `hasOpenedOnce` pattern.
    const [hasBeenInEditor, setHasBeenInEditor] = useState(false);
    if (!hasBeenInEditor && isEditorMode) {
        setHasBeenInEditor(true);
    }

    const [isPendingSettle, setIsPendingSettle] = useState(false);
    // The previous-mode tracker is `useState` rather than `useRef` so
    // that concurrent-mode discarded renders correctly roll back. A
    // ref mutated during render would persist its mutation through a
    // discarded render and miss the transition on replay.
    const [previousIsViewerMode, setPreviousIsViewerMode] = useState(false);

    // Detect viewer-mode edges during render so the gate engages in
    // the very same commit that flips into viewer mode — no flash of
    // viewer-at-stale-size.
    //
    // Engage decision is delegated to `computeViewerGateEngage` so it
    // is independently testable. Disengage on leaving viewer mode is
    // inlined here — without it, `setIsPendingSettle(true)` on
    // re-entry is a same-value no-op and the gate effect's
    // `[isPendingSettle]` dep does not change.
    if (previousIsViewerMode !== isViewerMode) {
        if (
            computeViewerGateEngage(
                previousIsViewerMode,
                isViewerMode,
                hasBeenInEditor
            )
        ) {
            setIsPendingSettle(true);
        } else if (!isViewerMode) {
            setIsPendingSettle(false);
        }
        setPreviousIsViewerMode(isViewerMode);
    }

    // Latest viewport, kept in a ref so the per-toggle gate effect
    // can re-check it without restarting (which would reset the
    // start snapshot and the upper-bound timer).
    const viewportRef = useRef({
        w: hostViewportWidth,
        h: hostViewportHeight
    });
    viewportRef.current = { w: hostViewportWidth, h: hostViewportHeight };

    // Per-toggle gate. Each time `isPendingSettle` flips true,
    // snapshot the host viewport at gate engage and watch for the
    // iframe to catch up. Wired identically in `<RetainedDenebEditor />`
    // for the opposite (expanding) direction.
    useViewportMatchGate({
        isPendingSettle,
        viewportRef,
        onSettled: setIsPendingSettle
    });

    if (!isViewerMode || isPendingSettle) return null;
    return <>{children}</>;
};
