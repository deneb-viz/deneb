import { hostServices } from '../services';
import { isFeatureEnabled } from '../utils/features';
import { getVegaSettings } from '../vega';

/**
 * Convenience constant that confirms whether the `selectionContextMenu` feature switch is enabled via features.
 */
export const isHighlightEnabled = isFeatureEnabled('selectionCrossHighlight');

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
