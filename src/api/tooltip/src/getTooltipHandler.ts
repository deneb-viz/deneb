import powerbi from 'powerbi-visuals-api';
import ITooltipService = powerbi.extensibility.ITooltipService;

import { resolveTooltipContent } from './resolveTooltipContent';

import { visualFeatures } from '../../../config';

export const getTooltipHandler = (
    isSettingEnabled: boolean,
    tooltipService: ITooltipService
) => {
    return (
        (visualFeatures.tooltipHandler &&
            isSettingEnabled &&
            resolveTooltipContent(tooltipService)) ||
        undefined
    );
};
