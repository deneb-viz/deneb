import {
    DEBUG_PANE_CONFIGURATION,
    SPLIT_PANE_CONFIGURATION
} from '@deneb-viz/configuration';

/**
 * How much vertical space (in percent) that the preview toolbar/debug pane
 * should occupy when initialized/reset to default.
 */
export const PREVIEW_PANE_TOOLBAR_DEFAULT_SIZE_PERCENT =
    DEBUG_PANE_CONFIGURATION.toolbarInitialPercent;

/**
 * How much horizontal space the editor pane should occupy when collapsed.
 */
export const EDITOR_PANE_SPLIT_COLLAPSED_SIZE =
    SPLIT_PANE_CONFIGURATION.collapsedSize;

/**
 * How much horizontal space (in percent) that the editor pane should occupy
 * when initialized/reset to default.
 */
export const EDITOR_PANE_SPLIT_DEFAULT_SIZE_PERCENT =
    SPLIT_PANE_CONFIGURATION.defaultSizePercent;

/**
 * How many pixels to reserve/calculate for displaying a resizable 'handle' on
 * any split panes.
 */
export const SPLIT_PANE_HANDLE_SIZE = 4;
