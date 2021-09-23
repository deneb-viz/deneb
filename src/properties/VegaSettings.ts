import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import SettingsBase from './SettingsBase';
import Debugger from '../Debugger';
import { getConfig } from '../core/utils/config';
import { isHandlerEnabled } from '../core/interactivity/tooltip';
import {
    isContextMenuEnabled,
    isDataPointEnabled
} from '../core/interactivity/selection';
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
    public renderMode = defaults.renderMode;
    public enableTooltips = isHandlerEnabled && defaults.enableTooltips;
    public enableContextMenu =
        isContextMenuEnabled && defaults.enableContextMenu;
    public enableSelection = isDataPointEnabled && defaults.enableSelection;
    public selectionMaxDataPoints = defaults.selectionMaxDataPoints;
    public tooltipDelay = isHandlerEnabled && defaults.tooltipDelay;
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
        Debugger.log('Processing enumeration...');
        enumerationObject.instances.map((i) => {
            if (!isFeatureEnabled('developerMode')) {
                Debugger.log("Removing 'debug only' properties...");
                enumerationObject.instances = [];
            } else {
                Debugger.log('Handling feature switches...');
                if (!isHandlerEnabled) {
                    delete enumerationObject.instances[0].properties[
                        'enableTooltips'
                    ];
                }
                if (!isContextMenuEnabled) {
                    delete enumerationObject.instances[0].properties[
                        'enableContextMenu'
                    ];
                }
                if (!isDataPointEnabled) {
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
