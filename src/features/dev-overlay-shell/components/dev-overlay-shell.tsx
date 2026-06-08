import { useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Where the overlay anchors against the visual surface. Both
 * supported positions are corner-anchored — the visual canvas only
 * has so many corners and overlays are dev-only HUDs, so this is
 * sufficient.
 */
export type DevOverlayPosition = 'top-left' | 'top-right';

export type DevOverlayShellProps = {
    /** Header label shown in the title bar. */
    title: string;
    position: DevOverlayPosition;
    /**
     * Maximum width (px) when expanded. The shell will not exceed
     * this width; content beyond wraps or scrolls horizontally
     * depending on its own styling.
     */
    maxWidth?: number;
    /**
     * Maximum height (px) for the expanded body. Content beyond this
     * scrolls vertically. The title bar is excluded from this
     * measurement.
     */
    maxHeight?: number;
    /** Optional initial collapsed state (default: false). */
    initiallyCollapsed?: boolean;
    children: ReactNode;
};

const PALETTE = {
    background: 'rgba(0, 0, 0, 0.78)',
    foreground: '#fff',
    border: 'rgba(255, 255, 255, 0.2)'
};

const FONT_FAMILY =
    'Consolas, "Courier New", Menlo, monospace, ui-monospace, SFMono-Regular';

const TITLE_BAR_HEIGHT = 22;

/**
 * Shared shell for dev-only HUD overlays. Provides:
 *
 *  - **Consistent positioning** — corner-anchored with a fixed
 *    8px inset.
 *  - **Consistent styling** — dark translucent background, monospace
 *    typography, subtle border.
 *  - **Minimize / restore** — a button in the top-right of the title
 *    bar collapses the panel to just the bar; clicking again
 *    expands it. State is component-local (resets on visual reload),
 *    which is fine for dev tooling.
 *  - **Scroll on overflow** — when expanded, the body region honours
 *    a `maxHeight` and scrolls vertically beyond it.
 *
 * Used by both {@link VisualUpdateHistoryOverlay} (lifecycle + history
 * + failures, top-left) and {@link ViewportGateDebugOverlay}
 * (viewport-match debug, top-right).
 */
export const DevOverlayShell = ({
    title,
    position,
    maxWidth,
    maxHeight,
    initiallyCollapsed = false,
    children
}: DevOverlayShellProps) => {
    const [collapsed, setCollapsed] = useState(initiallyCollapsed);

    const positionStyle: CSSProperties =
        position === 'top-left' ? { top: 8, left: 8 } : { top: 8, right: 8 };

    const shellStyle: CSSProperties = {
        position: 'fixed',
        ...positionStyle,
        backgroundColor: PALETTE.background,
        color: PALETTE.foreground,
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        lineHeight: 1.35,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 4,
        zIndex: 999999,
        maxWidth,
        pointerEvents: 'auto',
        userSelect: 'none',
        overflow: 'hidden'
    };

    const titleBarStyle: CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '2px 6px',
        height: TITLE_BAR_HEIGHT,
        boxSizing: 'border-box',
        fontWeight: 600,
        borderBottom: collapsed ? 'none' : `1px solid ${PALETTE.border}`,
        cursor: 'default'
    };

    const buttonStyle: CSSProperties = {
        background: 'transparent',
        color: 'inherit',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: '14px',
        lineHeight: 1,
        padding: '0 4px',
        marginLeft: 6
    };

    const bodyStyle: CSSProperties = {
        padding: '6px 8px',
        maxHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        whiteSpace: 'pre-wrap'
    };

    return (
        <div style={shellStyle}>
            <div style={titleBarStyle}>
                <span>{title}</span>
                <button
                    type='button'
                    style={buttonStyle}
                    onClick={() => setCollapsed((current) => !current)}
                    title={collapsed ? 'Restore' : 'Minimize'}
                    aria-label={
                        collapsed ? 'Restore overlay' : 'Minimize overlay'
                    }
                >
                    {collapsed ? '+' : '−'}
                </button>
            </div>
            {!collapsed && <div style={bodyStyle}>{children}</div>}
        </div>
    );
};
