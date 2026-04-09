import type { CSSProperties } from 'react';
import type { PartialOptions } from 'overlayscrollbars';

/**
 * Convert a 6-digit hex colour into an 8-digit hex with alpha, given 0–1 opacity.
 *
 * Defensive: clamps opacity to [0, 1]. Zero-pads single-digit hex alpha values
 * (e.g. opacity 0.02 → '05', not '5') so the result is always a valid 9-char
 * hex colour string. Uses `?? 1` so that `null`/`undefined` fall back to full
 * opacity while an explicit `0` correctly produces fully transparent (`00`).
 *
 * @example
 *   addAlpha('#000000', 0.2) // '#00000033'
 *   addAlpha('#ffffff', 1)   // '#ffffffff'
 *   addAlpha('#000000', 0.02) // '#00000005' (not '#0000005')
 *   addAlpha('#ff0000', 0)   // '#ff000000' (fully transparent)
 *   addAlpha('#ff0000', -1)  // '#ff000000' (negative clamps to 0)
 */
export const addAlpha = (color: string, opacity: number): string => {
    const _opacity = Math.round(Math.min(Math.max(opacity ?? 1, 0), 1) * 255);
    return `${color}${_opacity.toString(16).padStart(2, '0')}`;
};

/**
 * Stable overlayscrollbars options reference. Lifted to module scope so the
 * library does not re-apply options on every render (the library compares
 * the `options` prop by reference and calls `instance.options(...)` whenever
 * it changes). Shared by both `visual-viewer.tsx` and `preview-area.tsx`.
 */
export const SCROLLBAR_OPTIONS: PartialOptions = {
    scrollbars: {
        autoHide: 'never',
        visibility: 'auto'
    },
    overflow: { x: 'scroll', y: 'scroll' }
};

/**
 * Build the inline-style CSS custom properties object consumed by
 * `overlayscrollbars` on the host element. Maps Deneb's four user-configurable
 * display settings to the library's styling variables:
 *
 *   scrollbarWidth       → --os-size
 *   scrollbarColor +     → --os-handle-bg
 *     scrollbarOpacity      + --os-handle-bg-hover
 *                           + --os-handle-bg-active
 *   scrollbarRadius      → --os-handle-border-radius
 *
 * Hover and active states use the same computed thumb colour as the resting
 * state. Without setting these, the library defaults them to `none` when no
 * theme class is applied to the component, making the scrollbar handle vanish
 * on hover/click. This preserves the pre-refactor behaviour where the webkit
 * `::-webkit-scrollbar-thumb:hover` rule used the same colour as the resting
 * thumb.
 *
 * @param scrollbarColor 6-digit hex colour (e.g. '#000000')
 * @param scrollbarOpacity 0-100 percentage
 * @param scrollbarRadius pixel radius (0-8)
 * @param scrollbarWidth pixel width (8-16)
 * @returns Inline style object suitable for `style={...}` on an element
 */
export const getScrollbarStyleVars = (
    scrollbarColor: string,
    scrollbarOpacity: number,
    scrollbarRadius: number,
    scrollbarWidth: number
): CSSProperties => {
    const thumbColor = addAlpha(scrollbarColor, scrollbarOpacity / 100);
    return {
        '--os-size': `${scrollbarWidth}px`,
        '--os-handle-bg': thumbColor,
        '--os-handle-bg-hover': thumbColor,
        '--os-handle-bg-active': thumbColor,
        '--os-handle-border-radius': `${scrollbarRadius}px`
    } as CSSProperties;
};
