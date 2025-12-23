import powerbi from 'powerbi-visuals-api';

import { registerCustomExpressions } from './expressions';
import { registerVegaExtensions } from './runtime';
import { type PowerBiColorPalette } from '@deneb-viz/powerbi-compat/theme';
import { type ExtensibilityExpressionHandlers } from './types';

let _expressionHandlers: ExtensibilityExpressionHandlers = {};

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
    },
    /**
     * Set handlers for custom expression functions.
     * Call this from the host platform to provide implementations.
     */
    setExpressionHandlers: (handlers: ExtensibilityExpressionHandlers) => {
        _expressionHandlers = { ..._expressionHandlers, ...handlers };
    },
    /**
     * Get the currently registered expression handlers.
     */
    getExpressionHandlers: () => _expressionHandlers
};
Object.freeze(VegaExtensibilityServices);
