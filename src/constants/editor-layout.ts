import { SPLIT_PANE_CONFIGURATION } from '@deneb-viz/configuration';

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
