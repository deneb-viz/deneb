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
    // Last used version - will be manually provided upon spec persistence
    public version: string = null;
    // Whether to show the version notification or not; this helps to track if it has been previously dismissed, and is re-enabled via
    // the versioning APIs when needed
    public showVersionNotification = defaults.showVersionNotification;
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
