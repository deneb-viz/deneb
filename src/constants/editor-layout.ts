import { getConfig } from '../core/utils/config';

const { previewPane, splitPaneDefaults } = getConfig();

/**
 * HOw much vertical space to reserve for the main toolbar.
 */
export const ADVANCED_EDITOR_TOOLBAR_HEIGHT = 40;

/**
 * How much horizontal space the editor pane should occupy when collapsed.
 */
export const EDITOR_PANE_SPLIT_COLLAPSED_SIZE = splitPaneDefaults.collapsedSize;

/**
 * How much horizontal space (in percent) that the editor pane should occupy
 * when initialized/reset to default.
 */
export const EDITOR_PANE_SPLIT_DEFAULT_SIZE_PERCENT =
    splitPaneDefaults.defaultSizePercent;

/**
 * The maximum horizontal space (in percent) that the editor pane should be
 * permitted to occupy.
 */
export const EDITOR_PANE_SPLIT_MAX_SIZE_PERCENT =
    splitPaneDefaults.maxSizePercent;

/**
 * The maximum horizontal space that the editor pane should be permitted to
 * occupy when expanded.
 */
export const EDITOR_PANE_SPLIT_MIN_SIZE = splitPaneDefaults.minSize;

/**
 * Horizontal offset (in px) for toaster in editor view.
 */
export const EDITOR_TOAST_OFFSET_HORIZONTAL = 5;

/**
 * Vertical offset (in px) for toaster in editor view.
 */
export const EDITOR_TOAST_OFFSET_VERTICAL = 30;

/**
 * The z-index to apply to popover elements, as we are having to render them
 * inline.
 */
export const POPOVER_Z_INDEX = 1000;

/**
 * The minimum vertical space that the preview area should be permitted to
 * occupy, and prevent the toolbar/debug pane from using all available space.
 */
export const PREVIEW_PANE_AREA_MIN_SIZE = previewPane.areaMinSize;

/**
 * The amount of padding to apply around the preview area.
 */
export const PREVIEW_PANE_AREA_PADDING = 5;

/**
 * How much vertical space (in percent) that the preview toolbar/debug pane
 * should occupy when initialized/reset to default.
 */
export const PREVIEW_PANE_TOOLBAR_DEFAULT_SIZE_PERCENT =
    previewPane.toolbarInitialPercent;

/**
 * The minimum vertical space that the preview toolbar/debug pane should be
 * permitted to occupy (also used for collapsed size).
 */
export const PREVIEW_PANE_TOOLBAR_MIN_SIZE = previewPane.toolbarMinSize;

/**
 * The amount of padding to apply around the preview area toolbar/debug pane.
 */
export const PREVIEW_PANE_TOOLBAR_PADDING = 5;

/**
 * The amount of padding to apply to the smaller buttons in the preview/debug
 * pane toolbar.
 */
export const PREVIEW_PANE_TOOLBAR_BUTTON_PADDING = 2;

/**
 * How many pixels to reserve/calculate for displaying a resizable 'handle' on
 * any split panes.
 */
export const SPLIT_PANE_RESIZER_SIZE = 4;
