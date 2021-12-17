import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import SettingsBase from './SettingsBase';
import { getConfig } from '../core/utils/config';
import { isFetchMoreEnabled } from '../core/data/dataView';

const defaults = getConfig().propertyDefaults.dataLimit;

/**
 * Manages data limit override preferences for the visual.
 */
export default class DataLimitSettings extends SettingsBase {
    // Feature enabled or not
    public enabled: boolean = isFetchMoreEnabled;
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
        if (this.enabled) {
            enumerationObject.instances.map((i) => {
                // If not overriding then we don't need to show the addiitonal info options
                if (!this.override) {
                    delete i.properties['showCustomVisualNotes'];
                }
            });
        } else {
            enumerationObject.instances = [];
        }
        return enumerationObject;
    }
}
