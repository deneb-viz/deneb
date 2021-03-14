import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import SettingsBase from './SettingsBase';
import Debugger from '../Debugger';
import { dataLimitDefaults as defaults } from '../config';

/**
 * Manages data limit override preferences for the visual.
 */
export default class DataLimitSettings extends SettingsBase {
    // Feature enabled or not
    public enabled: boolean = defaults.enabled;
    // Allow override of `dataReductionAlgorithm` limit.
    public override: boolean = defaults.override;
    // Display information about the custom visual limitations and recommendations for end users.
    public showCustomVisualNotes: boolean = defaults.showCustomVisualNotes;

    /**
     * Business logic for the properties within this menu.
     * @param instances `VisualObjectInstance[]` to process
     * @returns Processed `VisualObjectInstance[]`
     */
    public processEnumerationObject(
        enumerationObject: VisualObjectInstanceEnumerationObject,
        options: {
            [propertyName: string]: any;
        } = {}
    ): VisualObjectInstanceEnumerationObject {
        Debugger.log('Processing enumeration for data limit...');
        if (this.enabled) {
            enumerationObject.instances.map((i) => {
                // If not overriding then we don't need to show the addiitonal info options
                if (!this.override) {
                    Debugger.log('Removing additional properties...');
                    delete i.properties['showCustomVisualNotes'];
                }
            });
        } else {
            enumerationObject.instances = [];
        }
        return enumerationObject;
    }
}
