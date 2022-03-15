/**
 * Used to specify applicable child elements to apply filters to within a SVG, if we need to exclude text elements from this.
 */
export const svgFilterExcludingText =
    'g.role-mark:not(.mark-text), g.role-legend-gradient, g.role-legend-symbol';

/**
 * Used to find the vega view (if rendering with SVG)
 */
export const svgVegaView = '.vega-embed svg';

/**
 * Convenience function for prefixing 'deneb-' to any third party elements.
 */
export const addSelectorNamespacePrefix = (suffix: string) => `deneb-${suffix}`;

/**
 * Get a URL reference by ID, suitable for use with SVG elements (e.g. fill patterns and filters).
 */
export const getUrlRefById = (id: string) => `url(#${id})`;
