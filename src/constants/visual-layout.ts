import { getConfig } from '../core/utils/config';

const { visualViewportAdjust } = getConfig();

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
