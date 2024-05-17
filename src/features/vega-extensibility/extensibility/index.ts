import { registerCustomExpressions } from './expressions';
import { registerCustomSchemes } from './schemes';

export { powerbiTheme, powerBiThemeVega } from './powerbi-theme';

/**
 * Use declare and initialize the service to ensure that it is available for
 * the lifetime of the current visual instance.
 */
export const VegaExtensibilityServices = {
    bind: (ordinalColorCount: number) => {
        registerCustomExpressions();
        registerCustomSchemes(ordinalColorCount);
    }
};
Object.freeze(VegaExtensibilityServices);
