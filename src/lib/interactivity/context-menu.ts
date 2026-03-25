import { type EventListenerHandler } from 'vega';

import { getResolvedRowIdentities, resolveDatumFromItem } from './data-point';
import { InteractivityManager } from './interactivity-manager';

import { resolveCoordinates } from './event';
import { type InteractivityLookupDataset } from './types';
import { getDenebVisualState } from '../../state';

/**
 * If a context menu event is fired over the visual, check whether the context
 * menu is enabled. If disabled, silently consume the event. If enabled, attempt
 * to retrieve any datum and associated identity before displaying the menu.
 *
 * Note that the context menu can only work with a single selector, so we will
 * only return a selector if it resolves to a single entry, otherwise drill
 * through doesn't actually result in the correct data being displayed.
 */
export const contextMenuHandler = (
    dataset: InteractivityLookupDataset
): EventListenerHandler => {
    return (event, item) => {
        event.stopPropagation();
        event.preventDefault();
        if (!isContextMenuEnabled()) return;
        const coordinates = resolveCoordinates(event as MouseEvent);
        const data = resolveDatumFromItem(item);
        const rowNumber = isContextMenuSelectorEnabled()
            ? getResolvedRowIdentities(data, dataset)
            : undefined;
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
 * Check whether the context menu should be shown at all.
 */
const isContextMenuEnabled = () => {
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

/**
 * Check whether data point resolution should be included in the context menu.
 */
const isContextMenuSelectorEnabled = () => {
    const {
        settings: {
            vega: {
                interactivity: {
                    enableContextMenuSelector: {
                        value: enableContextMenuSelector
                    }
                }
            }
        }
    } = getDenebVisualState();
    return enableContextMenuSelector || false;
};
