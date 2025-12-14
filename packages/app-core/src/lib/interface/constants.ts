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
 * The maximum horizontal space that the editor pane should be permitted to occupy when expanded.
 */
export const EDITOR_PANE_SPLIT_MIN_SIZE = SPLIT_PANE_CONFIGURATION.minSize;

/**
 * The maximum horizontal space (in percent) that the editor pane should be permitted to occupy.
 */
export const EDITOR_PANE_SPLIT_MAX_SIZE_PERCENT =
    SPLIT_PANE_CONFIGURATION.maxSizePercent;

/**
 * The amount of padding to apply around the preview area.
 */
export const PREVIEW_PANE_AREA_PADDING = 5;

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
 * The amount of padding to apply to the smaller buttons in the preview/debug pane toolbar.
 */
export const PREVIEW_PANE_TOOLBAR_BUTTON_PADDING = 2;

/**
 * How many pixels to reserve/calculate for displaying a resizable 'handle' on any split panes.
 */
export const SPLIT_PANE_HANDLE_SIZE = 4;

/**
 * The z-index to apply to popover elements, as we are having to render them inline.
 */
export const POPOVER_Z_INDEX = 1000;

/**
 * How many pixels to apply to the preview area calculations as a "safety" margin. On occasion, the calculation
 * results in a slightly higher than desirable scaling result and this helps to err on the lower-side of things so that
 * the preview will definitely fit.
 */
export const ZOOM_FIT_BUFFER = 15;
