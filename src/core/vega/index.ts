export { getVegaSettings };

import { getState } from '../../store';

/**
 * Convenience function to get current Vega/Spec settings from the visual objects (as we use this a lot).
 */
const getVegaSettings = () => getState().visualSettings.vega;
