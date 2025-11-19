import powerbi from 'powerbi-visuals-api';
import { type DataPointSelectionStatus } from './types';
import {
    type CrossFilterPropCheckOptions,
    getVisualInteractionStatus
} from '../visual-host';

/**
 * For the given `ISelectionId`, confirm whether it is present in the supplied `ISelectionId[]`. Typically used to
 * confirm against the visual's selection manager.
 */
export const getDataPointCrossFilterStatus = (
    id: powerbi.visuals.ISelectionId,
    selection: powerbi.visuals.ISelectionId[]
): DataPointSelectionStatus =>
    (selection.find((sid) => sid.equals(id)) && 'on') ||
    (selection.length === 0 && 'neutral') ||
    'off';

/**
 * Allows us to validate for all key pre-requisites before we can bind a selection event to the visual.
 */
export const isCrossFilterPropSet = (options: CrossFilterPropCheckOptions) => {
    const { enableSelection } = options;
    return (enableSelection && getVisualInteractionStatus()) || false;
};
