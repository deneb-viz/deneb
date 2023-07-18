import { getConfig } from '../core/utils/config';

const { visualViewportAdjust } = getConfig();

/**
 * Horizontal offset (in px) for toaster in visual view.
 */
export const VISUAL_TOAST_OFFSET_HORIZONTAL = 2;

/**
 * Vertical offset (in px) for toaster in visual view.
 */
export const VISUAL_TOAST_OFFSET_VERTICAL = -15;

/**
 * How much to adjust the visual viewport from the left for the rendered
 * specification.
 */
export const VISUAL_VIEWPORT_ADJUST_LEFT = visualViewportAdjust.left;

/**
 * How much to adjust the visual viewport from the top for the rendered
 * specification.
 */
export const VISUAL_VIEWPORT_ADJUST_TOP = visualViewportAdjust.top;
