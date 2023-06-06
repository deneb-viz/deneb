import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import VisualEnumerationInstanceKinds = powerbi.VisualEnumerationInstanceKinds;

import SettingsBase from './SettingsBase';
import { getConfig } from '../core/utils/config';

/**
 * Manages theme integration preferences.
 */

const defaults = getConfig().propertyDefaults.theme;

export default class ThemeSettings extends SettingsBase {
    // Number of discrete colors to use when computing the `pbiColorOrdinal` scheme hues
    public ordinalColorCount = defaults.ordinalColorCount;

    /**
     * Business logic for the properties within this menu.
     * @param enumerationObject - `VisualObjectInstanceEnumerationObject` to process.
     */
    public processEnumerationObject(
        enumerationObject: VisualObjectInstanceEnumerationObject
    ): VisualObjectInstanceEnumerationObject {
        enumerationObject.instances.map((i) => {
            i.validValues = {
                ordinalColorCount: {
                    numberRange: {
                        min: defaults.ordinalColorCountMin,
                        max: defaults.ordinalColorCountMax
                    }
                }
            };
            i.propertyInstanceKind = {
                ordinalColorCount: VisualEnumerationInstanceKinds.ConstantOrRule
            };
        });
        return enumerationObject;
    }
}
