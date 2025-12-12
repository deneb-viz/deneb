import powerbi from 'powerbi-visuals-api';

import { registerCustomExpressions } from './expressions';
import { registerVegaExtensions } from './runtime';
import { type PowerBiColorPalette } from '@deneb-viz/powerbi-compat/theme';
import { type InteractivityLookupDataset } from '@deneb-viz/powerbi-compat/interactivity';
import { type SelectionMode } from '@deneb-viz/template-usermeta';
import { type ExtensibilityServicesUpdateOptions } from './types';

let _dataset: InteractivityLookupDataset | null = null;
let _selectionMode: SelectionMode | null = null;
let _warnCallback: ((warning: string) => void) | null = null;

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
    update: (options: ExtensibilityServicesUpdateOptions) => {
        _dataset = options.dataset;
        _selectionMode = options.selectionMode as SelectionMode;
        _warnCallback = options.logWarn;
    },
    getOptions: (): ExtensibilityServicesUpdateOptions => {
        if (!_dataset || !_selectionMode || !_warnCallback) {
            throw new Error(
                'Extensibility services options have not been initialized. Ensure that you call VegaExtensibilityServices.update() prior to requesting options.'
            );
        }
        return {
            dataset: _dataset,
            selectionMode: _selectionMode,
            logWarn: _warnCallback
        };
    }
};
Object.freeze(VegaExtensibilityServices);
