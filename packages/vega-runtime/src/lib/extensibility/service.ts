import powerbi from 'powerbi-visuals-api';

import { registerCustomExpressions } from './expressions';
import { registerVegaExtensions } from './runtime';
import {
    type PowerBiColorPalette,
    POWERBI_THEME_DEFAULT
} from '@deneb-viz/powerbi-compat/theme';
import { type ExtensibilityExpressionHandlers } from './types';

let _expressionHandlers: ExtensibilityExpressionHandlers = {};
let _isBound = false;

/**
 * Use declare and initialize the service to ensure that it is available for the lifetime of the current app lifecycle.
 */
export const VegaExtensibilityServices = {
    bind: (
        pbiColorPalette?: powerbi.extensibility.ISandboxExtendedColorPalette
    ) => {
        if (_isBound) return; // Already bound
        registerCustomExpressions();
        registerVegaExtensions({
            pbiColorPalette: (pbiColorPalette ??
                POWERBI_THEME_DEFAULT) as PowerBiColorPalette
        });
        _isBound = true;
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
