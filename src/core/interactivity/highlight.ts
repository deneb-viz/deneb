import { hostServices } from '../services';
import { isFeatureEnabled } from '../utils/features';
import { getVegaSettings } from '../vega';

/**
 * Convenience constant that confirms whether the `selectionContextMenu` feature switch is enabled via features.
 */
export const isHighlightEnabled = isFeatureEnabled('selectionCrossHighlight');

/**
 * Denotes how we suffix fields in the dataset that contain highlight values.
 */
export const highlightFieldSuffix = '__highlight';

export const highlightStatusSuffix = `${highlightFieldSuffix}Status`;

export const highlightComparatorSuffix = `${highlightFieldSuffix}Comparator`;

/**
 * Determine if conditions are right to expose highlight functionality.
 */
export const isHighlightPropSet = () => {
    const { enableHighlight } = getVegaSettings();
    return (
        (hostServices.allowInteractions &&
            isHighlightEnabled &&
            enableHighlight) ||
        false
    );
};
