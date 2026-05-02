import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { DenebEditor } from './deneb-editor';
import { computeRetentionState } from './retained-deneb-editor-state';
import { useDenebState } from '../state';

export { computeRetentionState } from './retained-deneb-editor-state';

/**
 * Upper-bound timeout for the per-toggle viewport-match gate. Single
 * tunable for how long the editor stays hidden after a viewer↔editor
 * toggle when the host's iframe doesn't reach the reported viewport
 * within the expected window.
 *
 * Set from observed cold-open iframe-expansion timing (~1500ms) plus
 * margin. On extreme slow-host scenarios the timer fires and the
 * editor mounts at whatever size the iframe currently is — strictly
 * worse than a clean match release, but still better than no gate.
 */
const VIEWPORT_SETTLE_TIMEOUT_MS = 3000;

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
    const setModalDialogRole = useDenebState(
        (state) => state.interface.setModalDialogRole
    );
    const setInterfaceType = useDenebState((state) => state.interface.setType);
    const isProjectInitialized = useDenebState(
        (state) => state.project.__isInitialized__
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
    // catch up to a CHANGED host viewport.
    useEffect(() => {
        if (!isPendingSettle) return;
        if (typeof window === 'undefined') {
            setIsPendingSettle(false);
            return;
        }

        const startViewport = {
            w: viewportRef.current.w,
            h: viewportRef.current.h
        };
        let hostViewportHasChanged = false;
        let cancelled = false;

        const matches = (): boolean => {
            const v = viewportRef.current;
            if (v.w === undefined) return false;
            if (v.w !== startViewport.w) {
                hostViewportHasChanged = true;
            }
            // Width-only match. Empirically the host frequently reports
            // a `viewport.height` that does not equal `window.innerHeight`
            // (a ~36px persistent offset, likely host chrome). Width is
            // a reliable equality signal in observed traces.
            //
            // Both conditions must hold:
            //  (1) the host has reported a NEW viewport width since the
            //      gate engaged — protects against the stale match
            //      where the iframe is at viewer-mode size and the
            //      host has not yet sent the edit-mode viewport;
            //  (2) the iframe interior width matches the host's claim.
            return hostViewportHasChanged && window.innerWidth === v.w;
        };

        const trySettle = () => {
            if (cancelled) return;
            if (matches()) {
                // Set `cancelled` synchronously so any in-flight tick
                // (interval poll, queued resize event) that runs before
                // React processes the state update exits cleanly
                // instead of calling `setIsPendingSettle(false)` again.
                cancelled = true;
                setIsPendingSettle(false);
            }
        };

        trySettle();

        window.addEventListener('resize', trySettle);

        // The host viewport can change without firing a window resize
        // event, so a coarse interval poll while pending is the
        // simplest way to catch prop updates without coupling the
        // effect's deps to the viewport (which would reset the start
        // snapshot and timer on every host update). 100ms granularity
        // is well below the iframe-resize latency we are detecting
        // (~300ms warm, ~1500ms cold) and avoids the per-frame
        // scheduling pressure of a `requestAnimationFrame` chain.
        const pollIntervalId = window.setInterval(trySettle, 100);

        const upperBoundId = window.setTimeout(() => {
            if (!cancelled) {
                cancelled = true;
                setIsPendingSettle(false);
            }
        }, VIEWPORT_SETTLE_TIMEOUT_MS);

        return () => {
            cancelled = true;
            window.removeEventListener('resize', trySettle);
            window.clearInterval(pollIntervalId);
            window.clearTimeout(upperBoundId);
        };
    }, [isPendingSettle]);

    // Focus restoration: when the gate has just released after a
    // transition into editor mode, dispatch a focus request so the
    // active Monaco editor takes focus back from the Power BI chrome.
    useEffect(() => {
        if (isEditorMode && !isPendingSettle && hasOpenedOnce) {
            requestEditorFocus();
        }
    }, [isEditorMode, isPendingSettle, hasOpenedOnce, requestEditorFocus]);

    // Sync `interface.type` with editor visibility on every transition
    // into editor mode. `useDenebAppSetup('editor')` inside `<DenebEditor>`
    // dispatches `setType('editor')` only on first mount; with retention
    // the editor stays mounted and that hook does not re-run, so on the
    // SECOND open the type is still 'viewer' (left over from the
    // intervening `<DenebViewer>` mount). Anything reading
    // `interface.type` to gate UI (e.g. the unapplied-changes toast)
    // would mis-fire.
    useEffect(() => {
        if (isEditorMode) {
            setInterfaceType('editor');
        }
    }, [isEditorMode, setInterfaceType]);

    // Close any open ModalDialog when leaving editor mode. The dialog
    // surface is portaled by Fluent UI to document.body, so the
    // `display: none` on the shell does not hide it. Dispatching
    // `setModalDialogRole('None')` unmounts the portal cleanly.
    useEffect(() => {
        if (!isEditorMode && hasOpenedOnce) {
            setModalDialogRole('None');
        }
    }, [isEditorMode, hasOpenedOnce, setModalDialogRole]);

    // Auto-open the new-project ('Create') modal once the gate has
    // released for a no-project visual. Previously this was triggered
    // synchronously by `interface.setType('editor')`, which fires when
    // `<DenebEditor />` mounts — long before the iframe has expanded.
    // Fluent v9 dialogs portal to `document.body` and bypass our
    // wrapper's visibility gate, so opening it pre-expansion produced a
    // mis-sized dialog. Deferring to gate-release ensures the dialog
    // opens at the final viewport.
    useEffect(() => {
        if (
            isEditorMode &&
            !isPendingSettle &&
            hasOpenedOnce &&
            !isProjectInitialized
        ) {
            setModalDialogRole('Create');
        }
    }, [
        isEditorMode,
        isPendingSettle,
        hasOpenedOnce,
        isProjectInitialized,
        setModalDialogRole
    ]);

    const { shouldRender, isVisible } = computeRetentionState(
        hasOpenedOnce,
        isEditorMode
    );
    const isVisuallyShown = isVisible && !isPendingSettle;

    const placeholderMessage = useDenebState((state) =>
        state.i18n.translate('Text_Editor_Suspense_Message')
    );

    if (!shouldRender) {
        return isEditorMode ? (
            <Placeholder message={placeholderMessage} />
        ) : null;
    }

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
