import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import SettingsBase from './SettingsBase';
import { isFeatureEnabled } from '../core/utils/features';
import { getConfig } from '../core/utils/config';

/**
 * Manages data limit override preferences for the visual.
 */
export default class DisplaySettings extends SettingsBase {
    // Persisted height of visual viewport in view mode (should preserve height on re-init)
    public viewportHeight: number = null;
    // Persisted width of visual viewport in view mode (should preserve width on re-init)
    public viewportWidth: number = null;
    // SVG filter to apply to view
    public svgFilter: string = Object.keys(getConfig().svgFilters)[0];

    /**
     * Business logic for the properties within this menu.
     * @param enumerationObject - `VisualObjectInstanceEnumerationObject` to process.
     */
    public processEnumerationObject(
        enumerationObject: VisualObjectInstanceEnumerationObject
    ): VisualObjectInstanceEnumerationObject {
        enumerationObject.instances.map(() => {
            if (!isFeatureEnabled('developerMode')) {
                enumerationObject.instances = [];
            }
        });
        return enumerationObject;
    }
}
