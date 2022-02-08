import { hostServices } from '../services';
import { isFeatureEnabled } from '../utils/features';

/**
 * Convenience constant that confirms whether the `selectionContextMenu` feature switch is enabled via features.
 */
const isHighlightEnabled = isFeatureEnabled('selectionCrossHighlight');

/**
 * Denotes how we suffic fields in the dataset that contain highlight values.
 */
export const highlightFieldSuffix = '_highlight';

/**
 * Determine if conditions are right to expose highlight functionality.
 */
export const isHighlightPropSet = () => {
    // Still need to add prop in store/settings for switch
    return (hostServices.allowInteractions && isHighlightEnabled) || false;
};
