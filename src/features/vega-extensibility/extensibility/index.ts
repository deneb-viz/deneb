import powerbi from 'powerbi-visuals-api';
import { registerCustomExpressions } from './expressions';
import { type PowerBiColorPalette } from '@deneb-viz/powerbi-compat/theme';
import { registerVegaExtensions } from '@deneb-viz/vega-runtime/extensibility';

/**
 * Use declare and initialize the service to ensure that it is available for
 * the lifetime of the current visual instance.
 */
export const VegaExtensibilityServices = {
    bind: (
        pbiColorPalette: powerbi.extensibility.ISandboxExtendedColorPalette
    ) => {
        registerCustomExpressions();
        registerVegaExtensions({
            pbiColorPalette: pbiColorPalette as PowerBiColorPalette
        });
    }
};
Object.freeze(VegaExtensibilityServices);
