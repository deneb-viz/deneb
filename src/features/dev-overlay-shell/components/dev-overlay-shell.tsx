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
const INSET_PX = 8;

export const DevOverlayShell = ({
    title,
    position,
    maxWidth,
    initiallyCollapsed = false,
    children
}: DevOverlayShellProps) => {
    const [collapsed, setCollapsed] = useState(initiallyCollapsed);

    const positionStyle: CSSProperties =
        position === 'top-left'
            ? { top: INSET_PX, left: INSET_PX }
            : { top: INSET_PX, right: INSET_PX };

    const shellStyle: CSSProperties = {
        position: 'fixed',
        ...positionStyle,
        // Anchor vertical sizing to the iframe viewport. The shell
        // can grow to its content's natural height, capped at the
        // visual's available height (minus an 8px inset top and
        // bottom). When the content exceeds the cap, the body's
        // overflow-y handles scroll. Critically this means the
        // scrollbar engages in small visuals too — the previous
        // fixed `maxHeight={420}` left small visuals with no
        // scroll because the shell extended past the visible
        // bottom edge before its own cap kicked in.
        maxHeight: `calc(100vh - ${INSET_PX * 2}px)`,
        display: 'flex',
        flexDirection: 'column',
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
        flex: '0 0 auto',
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
        // `flex: 1 1 auto` lets the body fill the remaining shell
        // height; `minHeight: 0` is the flex-child trick that allows
        // a child of a flex column to shrink past its content's
        // intrinsic height — without it `overflow-y: auto` does
        // nothing because the body refuses to shrink below content.
        flex: '1 1 auto',
        minHeight: 0,
        padding: '6px 8px',
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

// ─── CollapsibleSection ──────────────────────────────────────────────────────

export type CollapsibleSectionProps = {
    /** Header label. */
    title: string;
    /** Default collapsed state (default: false). */
    initiallyCollapsed?: boolean;
    children: ReactNode;
};

const SECTION_HEADER_STYLE: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    fontWeight: 600,
    marginBottom: 4,
    color: 'rgba(255, 255, 255, 0.7)',
    userSelect: 'none'
};

const SECTION_DISCLOSURE_STYLE: CSSProperties = {
    fontSize: '9px',
    lineHeight: 1,
    opacity: 0.6,
    marginLeft: 6
};

/**
 * Single-section disclosure inside a {@link DevOverlayShell}. Click
 * the header to toggle. Used to keep noisy panels (update history,
 * verbose state dumps) hidden by default so the developer sees the
 * compact summary first and expands only when they need detail.
 * Component-local collapse state — same lifetime semantics as the
 * shell's minimize state.
 */
export const CollapsibleSection = ({
    title,
    initiallyCollapsed = false,
    children
}: CollapsibleSectionProps) => {
    const [collapsed, setCollapsed] = useState(initiallyCollapsed);
    return (
        <div>
            <div
                style={SECTION_HEADER_STYLE}
                onClick={() => setCollapsed((current) => !current)}
                role='button'
                aria-expanded={!collapsed}
            >
                <span>{title}</span>
                <span style={SECTION_DISCLOSURE_STYLE}>
                    {collapsed ? '▶' : '▼'}
                </span>
            </div>
            {!collapsed && <div>{children}</div>}
        </div>
    );
};
