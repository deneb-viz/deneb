import { getVisualInteractionStatus } from '../visual-host';
import { type CrossHighlightPropCheckOptions } from './types';

/**
 * Allows us to validate for all key pre-requisites before we can bind a selection event to the visual.
 */
export const isCrossHighlightPropSet = (
    options: CrossHighlightPropCheckOptions
) => {
    const { enableHighlight } = options;
    const interactionStatus = getVisualInteractionStatus();
    const isSet = enableHighlight && interactionStatus;
    return isSet;
};
