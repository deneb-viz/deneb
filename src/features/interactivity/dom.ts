import { View } from 'vega';
import { handleContextMenuEvent } from './context-menu';
import { handleCrossFilterEvent } from './cross-filter';

/**
 * For the supplied View, check conditions for context menu binding, and
 * apply/remove as necessary.
 */
export const bindContextMenuEvents = (view: View) => {
    view.addEventListener('contextmenu', handleContextMenuEvent);
};

/**
 * For the supplied View, check conditions for data point selection binding,
 * and apply/remove as necessary.
 */
export const bindCrossFilterEvents = (view: View) => {
    view.addEventListener('click', handleCrossFilterEvent);
};
