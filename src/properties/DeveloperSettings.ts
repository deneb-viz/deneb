import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import SettingsBase from './SettingsBase';
import { getConfig } from '../core/utils/config';
import { TLocale } from '../features/i18n';
import { isFeatureEnabled } from '../core/utils/features';

const defaults = getConfig().propertyDefaults.developer;

/**
 * Manages data limit override preferences for the visual.
 */
export default class DeveloperSettings extends SettingsBase {
    // Visual version. Used to check for updates
    public version: string = null;
    // Locale override for testing formatting and i18n
    public locale: TLocale = <TLocale>defaults.locale;

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
