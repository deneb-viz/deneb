import type {
    BindingsOrient,
    BindingsSettings
} from '@deneb-viz/vega-runtime/spec-processing';

/**
 * Whether the bindings pane is collapsed right now. The `collapsed` setting
 * gives the starting state, and the reader's choice overrides it. A pane
 * that is not collapsible is always expanded.
 */
export const resolveIsPaneCollapsed = (
    settings: Pick<BindingsSettings, 'collapsible' | 'collapsed'>,
    choice: boolean | null
): boolean => {
    if (!settings.collapsible) {
        return false;
    }
    return choice ?? settings.collapsed;
};

/**
 * Whether a pane on this edge runs along the width of the visual. A pane on
 * the top or bottom edge runs along the width; a pane on the left or right
 * edge is stacked along the height.
 */
export const isPaneAlongWidth = (orient: BindingsOrient): boolean =>
    orient === 'top' || orient === 'bottom';

/** A corner of the visual where the toggle of a collapsed pane can sit. */
export type CollapsedToggleCorner = 'bottomRight' | 'topRight' | 'topLeft';

/**
 * The corner of the visual where the toggle of a collapsed pane sits: the
 * corner nearest the pane's edge. A pane on the bottom edge puts it at the
 * bottom right, a pane on the left edge at the top left, and a pane on the
 * top or right edge at the top right.
 */
export const getCollapsedToggleCorner = (
    orient: BindingsOrient
): CollapsedToggleCorner => {
    switch (orient) {
        case 'bottom':
            return 'bottomRight';
        case 'left':
            return 'topLeft';
        case 'top':
        case 'right':
            return 'topRight';
    }
};
