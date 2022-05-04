import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import SettingsBase from './SettingsBase';
import { getConfig } from '../core/utils/config';
import {
    isContextMenuEnabled,
    isCrossFilterEnabled,
    isCrossHighlightEnabled,
    isTooltipHandlerEnabled
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
    public enableTooltips = isTooltipHandlerEnabled && defaults.enableTooltips;
    public enableContextMenu =
        isContextMenuEnabled && defaults.enableContextMenu;
    public enableSelection = isCrossFilterEnabled && defaults.enableSelection;
    public enableHighlight =
        isCrossHighlightEnabled && defaults.enableHighlight;
    public selectionMaxDataPoints = defaults.selectionMaxDataPoints;
    public tooltipDelay = isTooltipHandlerEnabled && defaults.tooltipDelay;
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
        enumerationObject.instances.map((i) => {
            if (!isFeatureEnabled('developerMode')) {
                enumerationObject.instances = [];
            } else {
                if (!isTooltipHandlerEnabled) {
                    delete enumerationObject.instances[0].properties[
                        'enableTooltips'
                    ];
                }
                if (!isContextMenuEnabled) {
                    delete enumerationObject.instances[0].properties[
                        'enableContextMenu'
                    ];
                }
                if (!isCrossFilterEnabled) {
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
