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

/** The width and height of a box, in CSS pixels. */
export type BoxSize = { width: number; height: number };

/**
 * How far an inline pane moves back from its edge, in CSS pixels, so that it
 * sits directly after a chart that is smaller than the space it is drawn in,
 * as Vega's own form did. Without it, the controls of a chart that sets its
 * own size sit at the far edge of the visual.
 *
 * Only a pane on the bottom or right edge moves: a chart is drawn from the
 * top left of its space, so a pane on the top or left edge is already beside
 * it. The pane stays on its edge when the chart fills its space, when the
 * chart overflows the other way, because the space then scrolls and its
 * scrollbar runs along that edge, and when the chart has not been drawn.
 */
export const getPaneOffset = (
    orient: BindingsOrient,
    space: BoxSize,
    chart: BoxSize
): number => {
    if (chart.width === 0 || chart.height === 0) {
        return 0;
    }
    switch (orient) {
        case 'bottom':
            return chart.width <= space.width
                ? Math.max(0, space.height - chart.height)
                : 0;
        case 'right':
            return chart.height <= space.height
                ? Math.max(0, space.width - chart.width)
                : 0;
        case 'top':
        case 'left':
            return 0;
    }
};

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
