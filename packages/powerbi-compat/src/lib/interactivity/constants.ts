import type { SelectionMode } from './types';

/**
 * Default interactivity settings.
 * @remarks consider that these may be moved as we determine how to handle interactivity mode generally.
 */
export const INTERACTIVITY_DEFAULTS = {
    enableContextMenu: true,
    enableHighlight: false,
    enableSelection: false,
    enableTooltips: true,
    selectionMaxDataPoints: 50,
    selectionMode: 'simple' as SelectionMode
};
