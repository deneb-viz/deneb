import powerbi from 'powerbi-visuals-api';
import ITooltipService = powerbi.extensibility.ITooltipService;

import { resolveCoordinates } from '../../event';
import { getTooltipIdentity } from './getTooltipIdentity';
import { extractTooltipDataItemsFromObject } from './extractTooltipDataItemsFromObject';

export const resolveTooltipContent = (tooltipService: ITooltipService) => (
    handler: any,
    event: MouseEvent,
    item: any,
    value: any
) => {
    const coordinates = resolveCoordinates(event),
        dataItems = extractTooltipDataItemsFromObject(item.tooltip),
        isTouchEvent = false,
        identities = getTooltipIdentity(item?.datum);
    switch (event.type) {
        case 'mouseover':
        case 'mousemove': {
            tooltipService.show({
                coordinates,
                dataItems,
                isTouchEvent,
                identities
            });
            break;
        }
        default: {
            const immediately = true;
            tooltipService.hide({
                immediately,
                isTouchEvent
            });
        }
    }
};
