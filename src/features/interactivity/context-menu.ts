import { ScenegraphEvent, Item } from 'vega';

import { getVegaSettings } from '../../core/vega';
import { getIdentitiesFromData, resolveDataFromItem } from './data-point';
import {
    getVisualInteractionStatus,
    getVisualSelectionManager
} from '../visual-host';

/**
 * If a context menu event is fired over the visual, attempt to retrieve any
 * datum and associated identity, before displaying the context menu.
 *
 * Note that the context menu can only work with a single selector, so we will
 * only return a selector if it resolves to a single entry, otherwise drill
 * through doesn't actually result in the correct data being displayed in the
 * D/T page. This is currently observed in Charticulator and it looks like the
 * core visuals avoid this situation, so we'll try to do the same for now.
 */
export const handleContextMenuEvent = (event: ScenegraphEvent, item: Item) => {
    event.stopPropagation();
    const mouseEvent: MouseEvent = <MouseEvent>window.event;
    const data = resolveDataFromItem(item);
    const identities = getIdentitiesFromData(data);
    const identity =
        (isContextMenuPropSet() && identities?.length === 1 && identities[0]) ||
        null;
    mouseEvent && mouseEvent.preventDefault();
    getVisualSelectionManager().showContextMenu(identity, {
        x: mouseEvent.clientX,
        y: mouseEvent.clientY
    });
};

/**
 * Allows us to validate for all key pre-requisites before we can bind a context
 * menu event to the visual.
 */
const isContextMenuPropSet = () => {
    const {
        interactivity: {
            enableContextMenu: { value: enableContextMenu }
        }
    } = getVegaSettings();
    return (enableContextMenu && getVisualInteractionStatus()) || false;
};
