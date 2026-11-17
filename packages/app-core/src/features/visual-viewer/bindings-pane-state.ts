import type { BindingsSettings } from '@deneb-viz/vega-runtime/spec-processing';

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
