/**
 * The amount of padding to apply around the preview area.
 */
export const PREVIEW_PANE_AREA_PADDING = 5;

/**
 * The amount of padding to apply to the smaller buttons in the preview/debug pane toolbar.
 */
export const PREVIEW_PANE_TOOLBAR_BUTTON_PADDING = 2;

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
