import powerbi from 'powerbi-visuals-api';
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

import { selectionKeywords } from '../../selection';

export const extractTooltipDataItemsFromObject = (
    tooltip: Object
): VisualTooltipDataItem[] => {
    return Object.entries({ ...tooltip })
        .filter(([k, v]) => selectionKeywords.indexOf(k) === -1)
        .map(([k, v]) => ({
            displayName: `${k}`,
            value: `${v}`
        }));
};
