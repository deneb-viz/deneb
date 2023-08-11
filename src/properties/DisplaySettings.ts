import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import SettingsBase from './SettingsBase';
import { isFeatureEnabled } from '../core/utils/features';
import { getConfig } from '../core/utils/config';

const defaults = getConfig().propertyDefaults.display;

/**
 * Manages data limit override preferences for the visual.
 */
export default class DisplaySettings extends SettingsBase {
    // Persisted height of visual viewport in view mode (should preserve height on re-init)
    public viewportHeight: number = null;
    // Persisted width of visual viewport in view mode (should preserve width on re-init)
    public viewportWidth: number = null;
    // Color of displayed scrollbars
    public scrollbarColor: string = defaults.scrollbarColor;
    // Opacity of displayed scrollbars
    public scrollbarOpacity: number = defaults.scrollbarOpacity;
    // Radius of displayed scrollbars
    public scrollbarRadius: number = defaults.scrollbarRadius.default;

    /**
     * Business logic for the properties within this menu.
     * @param enumerationObject - `VisualObjectInstanceEnumerationObject` to process.
     */
    public processEnumerationObject(
        enumerationObject: VisualObjectInstanceEnumerationObject
    ): VisualObjectInstanceEnumerationObject {
        enumerationObject.instances.map((i) => {
            if (!isFeatureEnabled('developerMode')) {
                delete i.properties['viewportHeight'];
                delete i.properties['viewportWidth'];
            }
            i.validValues = {
                scrollbarOpacity: { numberRange: { min: 0, max: 100 } },
                scrollbarRadius: {
                    numberRange: {
                        min: defaults.scrollbarRadius.min,
                        max: defaults.scrollbarRadius.max
                    }
                }
            };
        });
        return enumerationObject;
    }
}
