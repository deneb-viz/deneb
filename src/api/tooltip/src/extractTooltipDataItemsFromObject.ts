import powerbi from 'powerbi-visuals-api';
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

import { selectionKeywords, resolveDatumForKeywords } from '../../selection';

export const extractTooltipDataItemsFromObject = (
    tooltip: Object
): VisualTooltipDataItem[] =>
    resolveDatumForKeywords(tooltip).map(([k, v]) => ({
        displayName: `${k}`,
        value: `${v}`
    }));
