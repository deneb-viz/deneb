import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { DenebEditor } from './deneb-editor';
import { computeRetentionState } from './retained-deneb-editor-state';
import { useViewportMatchGate } from './viewport-match-gate-state';
import { useEditorModeSync } from './use-editor-mode-sync';
import { useDenebState } from '../state';

export { computeRetentionState } from './retained-deneb-editor-state';

const wrapperStyle = (isVisuallyShown: boolean): CSSProperties => ({
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    visibility: isVisuallyShown ? 'visible' : 'hidden'
});

const placeholderContainerStyle: CSSProperties = {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    flex: '1 1 0',
    fontFamily:
        'Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: '14px',
    justifyContent: 'center',
    minHeight: 0,
    minWidth: 0,
    opacity: 0.6,
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none'
};

/**
 * Lightweight placeholder shown during gate-pending. Sits absolutely
 * positioned so it overlays the (visibility:hidden) editor wrapper
 * without competing for layout. Reuses the existing i18n string so
 * the user sees one continuous "Preparing editor" surface.
 */
const Placeholder = ({ message }: { message: string }) => (
    <div
        style={placeholderContainerStyle}
        data-testid='deneb-retained-editor-placeholder'
    >
        <span>{message}</span>
    </div>
);

interface RetainedDenebEditorProps {
    /**
     * Caller-resolved boolean: `true` exactly when the visual's display
     * mode is `'editor'`. Kept as a boolean rather than a `DisplayMode`
     * union so this component does not pull in either of the
     * package-local `DisplayMode` declarations (one in app-core, one in
     * the root visual).
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
     * `hostViewportWidth` for semantics.
     */
    hostViewportHeight: number | undefined;
}

/**
 * Retains the editor tree across viewer↔editor toggles after the first
 * successful open in the session, and gates the wrapper's visibility
 * on the iframe physically reaching the host-reported viewport size on
 * every transition into editor mode.
 *
 * Behaviour summary:
 *  - Before any editor open: renders nothing.
 *  - On the first transition into editor mode the latch flips and
 *    `<DenebEditor />` is mounted permanently.
 *  - On every transition into editor mode the wrapper is held at
 *    `display: none` until either:
 *      a) `window.innerWidth/Height` matches the latest
 *         `hostViewportWidth/Height` AND the host viewport has changed
 *         since the gate engaged (proving the host has paced through
 *         its transition), OR
 *      b) `VIEWPORT_SETTLE_TIMEOUT_MS` elapses (safety net).
 *  - When the gate releases, `requestEditorFocus()` fires so the
 *    active Monaco editor takes focus back from the Power BI chrome.
 *
 * The match-based signal replaces the previous `ResizeObserver`
 * stability detection. RO can tell us "the size stopped changing"
 * but not "the size matches the host's intent" — and during the
 * initial period when the iframe hasn't yet been resized, RO reports
 * "stable" at the wrong size. Comparing against the host-reported
 * viewport is a positive signal that the iframe has caught up.
 */
export const RetainedDenebEditor = ({
    isEditorMode,
    hostViewportWidth,
    hostViewportHeight
}: RetainedDenebEditorProps) => {
    const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
    const [isPendingSettle, setIsPendingSettle] = useState(false);
    // The previous-mode tracker is `useState` rather than `useRef` so
    // that React's render-discard semantics keep it consistent with the
    // rest of the component's state. A ref mutated during render would
    // persist its mutation through a discarded render in concurrent
    // mode, causing the transition to be missed on replay and the gate
    // never to engage. State updates during render are concurrent-safe:
    // React schedules an immediate re-render with the new state and
    // rolls discarded updates back.
    const [previousIsEditorMode, setPreviousIsEditorMode] = useState(false);
    const requestEditorFocus = useDenebState(
        (state) => state.requestEditorFocus
    );
    const placeholderMessage = useDenebState((state) =>
        state.i18n.translate('Text_Editor_Suspense_Message')
    );

    // Latest viewport, kept in a ref so the per-toggle gate effect can
    // re-check it without restarting (which would reset the start
    // snapshot and the upper-bound timer).
    const viewportRef = useRef({
        w: hostViewportWidth,
        h: hostViewportHeight
    });
    viewportRef.current = { w: hostViewportWidth, h: hostViewportHeight };

    // Latch — once true, never flips back. `useState` (not a ref) so
    // discarded renders correctly roll back.
    if (!hasOpenedOnce && isEditorMode) {
        setHasOpenedOnce(true);
    }

    // Detect viewer↔editor transitions during render so the wrapper is
    // hidden in the very same commit that flips into editor mode — no
    // flash of editor-at-compressed-size.
    //
    // `setIsPendingSettle(isEditorMode)` covers both directions:
    //   isEditorMode → true:  engage gate, hide editor until match
    //   isEditorMode → false: reset the flag so a subsequent re-entry
    //     can flip it from false to true again. Without this reset,
    //     `setIsPendingSettle(true)` on re-entry is a same-value React
    //     no-op, the gate effect's [isPendingSettle] dep does not
    //     change, the effect never re-runs, and the editor stays
    //     `visibility: hidden` for the rest of the session.
    //
    // Convergence invariant: each branch fires exactly once per edge
    // (false→true or true→false). Widening either guard (e.g. dropping
    // the `!== isEditorMode` check) would loop.
    if (previousIsEditorMode !== isEditorMode) {
        setIsPendingSettle(isEditorMode);
        setPreviousIsEditorMode(isEditorMode);
    }

    // Per-toggle gate. Each time `isPendingSettle` flips true, snapshot
    // the host viewport at gate engage and watch for the iframe to
    // catch up to a CHANGED host viewport. Wired identically in
    // `<GatedDenebViewer />` for the opposite (shrinking) direction.
    useViewportMatchGate({
        isPendingSettle,
        viewportRef,
        onSettled: setIsPendingSettle
    });

    // Focus restoration: when the gate has just released after a
    // transition into editor mode, dispatch a focus request so the
    // active Monaco editor takes focus back from the Power BI chrome.
    useEffect(() => {
        if (isEditorMode && !isPendingSettle && hasOpenedOnce) {
            requestEditorFocus();
        }
    }, [isEditorMode, isPendingSettle, hasOpenedOnce, requestEditorFocus]);

    // Side-effect bridge to the global stores (interface.type sync,
    // modal close on exit, deferred Create modal auto-open). Lifted
    // into a sibling hook so this component stays focused on render
    // and gate decisions; see use-editor-mode-sync.ts for the per-
    // effect rationale.
    useEditorModeSync({ isEditorMode, isPendingSettle, hasOpenedOnce });

    const { shouldRender, isVisible } = computeRetentionState(
        hasOpenedOnce,
        isEditorMode
    );
    const isVisuallyShown = isVisible && !isPendingSettle;

    // shouldRender = hasOpenedOnce || isEditorMode, so when this guard
    // is true both are false - the editor has never been opened in
    // this session AND the user is not currently in editor mode.
    // Nothing to render. The placeholder is rendered below as part
    // of the retained shell once `shouldRender` is true.
    if (!shouldRender) return null;

    return (
        <div
            style={{
                display: isEditorMode ? 'flex' : 'none',
                flexDirection: 'column',
                height: '100%',
                position: 'relative',
                width: '100%'
            }}
            data-testid='deneb-retained-editor-shell'
        >
            <div
                style={wrapperStyle(isVisuallyShown)}
                data-testid='deneb-retained-editor'
                aria-hidden={!isVisuallyShown}
            >
                <DenebEditor />
            </div>
            {!isVisuallyShown && isEditorMode && (
                <Placeholder message={placeholderMessage} />
            )}
        </div>
    );
};
