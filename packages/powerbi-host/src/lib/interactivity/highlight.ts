import { getDenebVisualState } from '../../state';

/**
 * Allows us to validate for all key pre-requisites before we can bind a selection event to the visual.
 */
export const isCrossHighlightPropSet = () => {
    const {
        host: { allowInteractions },
        settings: {
            vega: {
                interactivity: {
                    enableHighlight: { value: enableHighlight }
                }
            }
        }
    } = getDenebVisualState();
    const isSet = enableHighlight && allowInteractions;
    return isSet;
};
