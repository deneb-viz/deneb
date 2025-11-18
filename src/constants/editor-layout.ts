import {
    DEBUG_PANE_CONFIGURATION,
    SPLIT_PANE_CONFIGURATION
} from '@deneb-viz/configuration';

/**
 * HOw much vertical space to reserve for the main toolbar.
 */
export const ADVANCED_EDITOR_TOOLBAR_HEIGHT = 40;

/**
 * The maximum horizontal space (in percent) that the editor pane should be
 * permitted to occupy.
 */
export const EDITOR_PANE_SPLIT_MAX_SIZE_PERCENT =
    SPLIT_PANE_CONFIGURATION.maxSizePercent;

/**
 * The maximum horizontal space that the editor pane should be permitted to
 * occupy when expanded.
 */
export const EDITOR_PANE_SPLIT_MIN_SIZE = SPLIT_PANE_CONFIGURATION.minSize;

/**
 * The z-index to apply to popover elements, as we are having to render them
 * inline.
 */
export const POPOVER_Z_INDEX = 1000;

/**
 * The minimum vertical space that the preview area should be permitted to
 * occupy, and prevent the toolbar/debug pane from using all available space.
 */
export const PREVIEW_PANE_AREA_MIN_SIZE = DEBUG_PANE_CONFIGURATION.areaMinSize;

/**
 * The amount of padding to apply around the preview area.
 */
export const PREVIEW_PANE_AREA_PADDING = 5;

/**
 * How much vertical space (in percent) that the preview toolbar/debug pane
 * should occupy when initialized/reset to default.
 */
export const PREVIEW_PANE_TOOLBAR_DEFAULT_SIZE_PERCENT =
    DEBUG_PANE_CONFIGURATION.toolbarInitialPercent;

/**
 * The minimum vertical space that the preview toolbar/debug pane should be
 * permitted to occupy (also used for collapsed size).
 */
export const PREVIEW_PANE_TOOLBAR_MIN_SIZE =
    DEBUG_PANE_CONFIGURATION.toolbarMinSize;

/**
 * The amount of padding to apply around the preview area toolbar/debug pane.
 */
export const PREVIEW_PANE_TOOLBAR_PADDING = 5;

/**
 * The amount of padding to apply to the smaller buttons in the preview/debug
 * pane toolbar.
 */
export const PREVIEW_PANE_TOOLBAR_BUTTON_PADDING = 2;
