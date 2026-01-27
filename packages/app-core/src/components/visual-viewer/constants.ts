/**
 * ID of the container element for the Vega output.
 */
export const VEGA_CONTAINER_ID = 'deneb-vega-container';

/**
 * Total pixels to subtract from viewport dimensions to prevent overflow/scrollbar issues.
 * This is 8px due to legacy layered adjustments (previously 4px at store level + 4px at component level)
 * that were consolidated during refactoring.
 * @remarks We're tracking this in issue #480.
 */
export const VEGA_VIEWPORT_ADJUST = 8;
