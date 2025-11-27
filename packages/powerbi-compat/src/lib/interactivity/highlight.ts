import { logDebug } from '@deneb-viz/utils/logging';
import {
    type CrossHighlightPropCheckOptions,
    getVisualInteractionStatus
} from '../visual-host';

/**
 * Allows us to validate for all key pre-requisites before we can bind a selection event to the visual.
 */
export const isCrossHighlightPropSet = (
    options: CrossHighlightPropCheckOptions
) => {
    const { enableHighlight } = options;
    const interactionStatus = getVisualInteractionStatus();
    const isSet = enableHighlight && interactionStatus;
    logDebug('isCrossHighlightPropSet', {
        enableHighlight,
        interactionStatus,
        isSet
    });
    return isSet;
};
