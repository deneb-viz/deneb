import { type EventListenerHandler } from 'vega';

import { getResolvedRowIdentities, resolveDatumFromItem } from './data-point';
import { InteractivityManager } from './interactivity-manager';

import { resolveCoordinates } from './event';
import { type InteractivityLookupDataset } from './types';
import { getDenebVisualState } from '../../state';

/**
 * If a context menu event is fired over the visual, attempt to retrieve any datum and associated identity, before
 * displaying the context menu.
 *
 * Note that the context menu can only work with a single selector, so we will only return a selector if it resolves to
 * a single entry, otherwise drill through doesn't actually result in the correct data being displayed in the D/T page.
 * This is currently observed in Charticulator and it looks like the core visuals avoid this situation, so we'll try to
 * do the same for now.
 */
export const contextMenuHandler = (
    dataset: InteractivityLookupDataset
): EventListenerHandler => {
    return (event, item) => {
        event.stopPropagation();
        const coordinates = resolveCoordinates(event as MouseEvent);
        const data = resolveDatumFromItem(item);
        const rowNumber = isContextMenuPropSet()
            ? getResolvedRowIdentities(data, dataset)
            : undefined;
        event.preventDefault();
        InteractivityManager.showContextMenu(
            rowNumber?.length === 1 ? rowNumber[0] : undefined,
            {
                x: coordinates[0],
                y: coordinates[1]
            }
        );
    };
};

/**
 * Allows us to validate for all key pre-requisites before we can bind a context menu event to the visual.
 */
const isContextMenuPropSet = () => {
    const {
        host: { allowInteractions },
        settings: {
            vega: {
                interactivity: {
                    enableContextMenu: { value: enableContextMenu }
                }
            }
        }
    } = getDenebVisualState();
    return (enableContextMenu && allowInteractions) || false;
};
