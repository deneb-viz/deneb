import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import SettingsBase from './SettingsBase';

/**
 * Provides overrides to the General pane that gets created now that we're
 * using dynamic format strings.
 */
export default class DeveloperSettings extends SettingsBase {
    /**
     * Business logic for the properties within this menu.
     * @param enumerationObject - `VisualObjectInstanceEnumerationObject` to process.
     */
    public processEnumerationObject(
        enumerationObject: VisualObjectInstanceEnumerationObject
    ): VisualObjectInstanceEnumerationObject {
        enumerationObject.instances.map(() => {
            enumerationObject.instances = [];
        });
        return enumerationObject;
    }
}
