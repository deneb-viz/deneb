import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import SettingsBase from './SettingsBase';
import { getConfig } from '../core/utils/config';
import {
    IS_CONTEXT_MENU_ENABLED,
    IS_CROSS_FILTER_ENABLED,
    IS_CROSS_HIGHLIGHT_ENABLED,
    IS_TOOLTIP_HANDLER_ENABLED
} from '../features/interactivity';
import { isFeatureEnabled } from '../core/utils/features';

const defaults = getConfig().propertyDefaults.vega,
    config = getConfig().selection;

/**
 * Manages the specification grammar and the user-provided source
 */
export default class VegaSettings extends SettingsBase {
    public jsonSpec: string = defaults.jsonSpec;
    public jsonConfig: string = defaults.jsonConfig;
    public provider = defaults.provider;
    public logLevel = defaults.logLevel;
    public version: string = null;
    public renderMode = defaults.renderMode;
    public enableTooltips =
        IS_TOOLTIP_HANDLER_ENABLED && defaults.enableTooltips;
    public enableContextMenu =
        IS_CONTEXT_MENU_ENABLED && defaults.enableContextMenu;
    public enableSelection =
        IS_CROSS_FILTER_ENABLED && defaults.enableSelection;
    public enableHighlight =
        IS_CROSS_HIGHLIGHT_ENABLED && defaults.enableHighlight;
    public selectionMaxDataPoints = defaults.selectionMaxDataPoints;
    public tooltipDelay = IS_TOOLTIP_HANDLER_ENABLED && defaults.tooltipDelay;
    public isNewDialogOpen = defaults.isNewDialogOpen;

    /**
     * Business logic for the properties within this menu.
     * @param enumerationObject - `VisualObjectInstanceEnumerationObject` to process.
     * @param options           - any specific options we wish to pass from elsewhere in the visual that our settings may depend upon.
     */
    public processEnumerationObject(
        enumerationObject: VisualObjectInstanceEnumerationObject,
        options: {
            [propertyName: string]: any;
        } = {}
    ): VisualObjectInstanceEnumerationObject {
        enumerationObject.instances.map(() => {
            if (!isFeatureEnabled('developerMode')) {
                enumerationObject.instances = [];
            } else {
                if (!IS_TOOLTIP_HANDLER_ENABLED) {
                    delete enumerationObject.instances[0].properties[
                        'enableTooltips'
                    ];
                }
                if (!IS_CONTEXT_MENU_ENABLED) {
                    delete enumerationObject.instances[0].properties[
                        'enableContextMenu'
                    ];
                }
                if (!IS_CROSS_FILTER_ENABLED) {
                    delete enumerationObject.instances[0].properties[
                        'enableSelection'
                    ];
                }
                enumerationObject.instances[0].validValues = {
                    selectionMaxDataPoints: {
                        numberRange: {
                            min: config.minDataPointsValue,
                            max: config.maxDataPointsValue
                        }
                    }
                };
            }
        });
        return enumerationObject;
    }
}
