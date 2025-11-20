import {
    DEBUG_PANE_CONFIGURATION,
    SPLIT_PANE_CONFIGURATION
} from '@deneb-viz/configuration';

/**
 * How much vertical space to reserve for the main toolbar.
 */
export const EDITOR_TOOLBAR_HEIGHT = 40;

/**
 * How much horizontal space the editor pane should occupy when collapsed.
 */
export const EDITOR_PANE_SPLIT_COLLAPSED_SIZE =
    SPLIT_PANE_CONFIGURATION.collapsedSize;

/**
 * How much horizontal space (in percent) that the editor pane should occupy when initialized/reset to default.
 */
export const EDITOR_PANE_SPLIT_DEFAULT_SIZE_PERCENT =
    SPLIT_PANE_CONFIGURATION.defaultSizePercent;

/**
 * How much vertical space (in percent) that the preview toolbar/debug pane should occupy when initialized/reset to
 * default.
 */
export const PREVIEW_PANE_TOOLBAR_DEFAULT_SIZE_PERCENT =
    DEBUG_PANE_CONFIGURATION.toolbarInitialPercent;

/**
 * The minimum vertical space that the preview toolbar/debug pane should be permitted to occupy (also used for
 * collapsed size).
 */
export const PREVIEW_PANE_TOOLBAR_MIN_SIZE =
    DEBUG_PANE_CONFIGURATION.toolbarMinSize;

/**
 * How many pixels to reserve/calculate for displaying a resizable 'handle' on any split panes.
 */
export const SPLIT_PANE_HANDLE_SIZE = 4;

/**
 * The z-index to apply to popover elements, as we are having to render them inline.
 */
export const POPOVER_Z_INDEX = 1000;
