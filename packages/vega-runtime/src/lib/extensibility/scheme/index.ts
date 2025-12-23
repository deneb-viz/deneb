import { scheme } from 'vega';

import type { VegaExtensibilityConfiguration } from '../runtime';
import { getVegaSchemesPowerBi, registerCurrentPalette } from './powerbi';

export {
    getPowerBiThemeBase,
    getPowerBiThemeVega,
    getThemeColorByIndex,
    getThemeColorByName
} from './powerbi';
export { VEGA_LITE_SCHEME_ADDITIONS } from './constants';

/**
 * Bind custom schemes to the view that sync to the report theme.
 */
export const registerCustomVegaSchemes = (
    options: VegaExtensibilityConfiguration
) => {
    registerCurrentPalette(options.pbiColorPalette);
    const schemes = getVegaSchemesPowerBi();
    for (const entry of schemes) {
        scheme(entry.name, entry.values as any);
    }
};
