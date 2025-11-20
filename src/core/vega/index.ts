export { IVegaViewDatum, getVegaSettings };

import { getState } from '../../store';

/**
 * Interface specifying a flexible key/value pair object, which is supplied from Vega's tooltip handler and usually casted as `any`.
 */
interface IVegaViewDatum {
    [key: string]: any;
}

/**
 * Convenience function to get current Vega/Spec settings from the visual objects (as we use this a lot).
 */
const getVegaSettings = () => getState().visualSettings.vega;
