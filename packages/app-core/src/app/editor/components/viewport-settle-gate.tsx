import { type CSSProperties, type ReactNode, useRef } from 'react';

import { useDenebState } from '../../../state';
import { useContainerStable } from '../hooks/use-container-stable';

/**
 * Upper-bound timeout for the viewport-settle gate.
 *
 * The gate normally releases via stability detection — two consecutive
 * `ResizeObserver` callbacks reporting the same width — but this timer
 * is the safety net for hosts that never produce a stable observation
 * (older Power BI host quirks, never-firing RO in test environments).
 *
 * 500ms covers the observed Power BI edit-mode CSS animation duration
 * (≤ 500ms in a healthy dev box, with ample margin for slower hardware).
 * If a regression makes this too tight, raise the value here — it is
 * the single tunable for the gate.
 */
export const VIEWPORT_SETTLE_TIMEOUT_MS = 500;

const wrapperStyle: CSSProperties = {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%'
};

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
    opacity: 0.6
};

/**
 * Lightweight placeholder rendered while the gate is pending. Deliberately
 * framework-light — it sits outside `FluentProvider` so we cannot use
 * Fluent components without console warnings, and we don't want the
 * placeholder itself to contribute meaningful synchronous mount cost.
 *
 * Reuses the same i18n string as `<EditorSuspense>` so the user sees one
 * continuous "Preparing editor" surface from mode-flip through gate
 * release through (on cold opens) the Suspense fallback.
 */
const ViewportSettlePlaceholder = () => {
    const translate = useDenebState((state) => state.i18n.translate);
    return (
        <div
            style={placeholderContainerStyle}
            data-testid='deneb-viewport-settle-placeholder'
        >
            <span>{translate('Text_Editor_Suspense_Message')}</span>
        </div>
    );
};

interface ViewportSettleGateProps {
    children: ReactNode;
}

/**
 * Gates `children` behind a measurement-based wait so the heavy editor
 * tree (Allotment, Monaco, Vega) does not synchronously mount while the
 * Power BI host is still animating the visual frame to its final size.
 *
 * The gate's wrapper div fills 100% of its parent, so its
 * `ResizeObserver` width tracks the host iframe as it expands. Once the
 * width has been reported twice in a row — or the upper-bound timer
 * elapses — the gate renders `children`. Until then it shows a
 * lightweight placeholder.
 *
 * The gate is a one-shot signal per mount: once released it never
 * returns to pending, so subsequent host resizes do not re-show the
 * placeholder.
 */
export const ViewportSettleGate = ({ children }: ViewportSettleGateProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const settled = useContainerStable(
        containerRef,
        VIEWPORT_SETTLE_TIMEOUT_MS
    );
    return (
        <div ref={containerRef} style={wrapperStyle}>
            {settled ? children : <ViewportSettlePlaceholder />}
        </div>
    );
};
