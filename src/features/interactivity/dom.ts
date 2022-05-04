import { View } from 'vega';
import { select } from 'd3-selection';
import { handleContextMenuEvent } from './context-menu';
import { handleCrossFilterEvent } from './cross-filter';

/**
 * For the supplied View, check conditions for context menu binding, and
 * apply/remove as necessary.
 */
export const bindContextMenuEvents = (view: View) => {
    view.addEventListener('contextmenu', handleContextMenuEvent);
    select(clearCatcherSelector(true)).on(
        'contextmenu',
        handleContextMenuEvent
    );
};

/**
 * For the supplied View, check conditions for data point selection binding,
 * and apply/remove as necessary.
 */
export const bindCrossFilterEvents = (view: View) => {
    view.addEventListener('click', handleCrossFilterEvent);
    select(clearCatcherSelector(true)).on('click', handleCrossFilterEvent);
};

/**
 * Used to resolve the CSS selector for the clear-catcher element.
 */
const clearCatcherSelector = (prefix = false) =>
    `${(prefix && '.') || ''}vega-embed`;
