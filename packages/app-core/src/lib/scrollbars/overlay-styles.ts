export type OverlayScrollbarOptions = {
    /** rgba string, token reference, or CSS variable for the thumb */
    thumbColor: string;
    /** thumb border-radius in px (Firefox ignores border-radius) */
    radius: number;
    /** scrollbar track width in px; Firefox maps ≤8 → thin, >8 → auto */
    width: number;
};

/**
 * Pure factory returning a Griffel-compatible style object for overlay scrollbars.
 *
 * Usage in makeStyles:
 *   makeStyles({ root: getOverlayScrollbarStyles({ thumbColor: tokens.colorNeutralForeground3, radius: 4, width: 8 }) })
 *
 * Overlay-on-demand: `overflow: auto` means the scrollbar only appears when content overflows.
 * Firefox renders square thumbs (no border-radius support) — accepted degradation.
 */
export const getOverlayScrollbarStyles = ({
    thumbColor,
    radius,
    width
}: OverlayScrollbarOptions) =>
    ({
        overflow: 'auto',
        // Firefox
        scrollbarWidth: (width <= 8 ? 'thin' : 'auto') as 'thin' | 'auto',
        scrollbarColor: `${thumbColor} transparent`,
        // Webkit (Chromium, Safari, mobile)
        '::-webkit-scrollbar': {
            width: `${width}px`,
            height: `${width}px`,
            background: 'transparent'
        },
        '::-webkit-scrollbar-thumb': {
            background: thumbColor,
            borderRadius: `${radius}px`
        },
        '::-webkit-scrollbar-thumb:hover': {
            background: thumbColor
        },
        '::-webkit-scrollbar-track': {
            background: 'transparent'
        },
        '::-webkit-scrollbar-corner': {
            background: 'transparent'
        }
    }) as const;
