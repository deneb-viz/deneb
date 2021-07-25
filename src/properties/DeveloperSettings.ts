import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import SettingsBase from './SettingsBase';
import Debugger from '../Debugger';
import { getConfig } from '../api/config';
import { isDeveloperModeEnabled } from '../api/developer';
import { TLocale } from '../core/ui/i18n';

/**
 * Manages data limit override preferences for the visual.
 */
export default class DeveloperSettings extends SettingsBase {
    // Locale override for testing formatting and i18n
    public locale: TLocale = <TLocale>(
        getConfig().propertyDefaults.developer.locale
    );

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
            if (!isDeveloperModeEnabled) {
                Debugger.log('Removing object & properties...');
                enumerationObject.instances = [];
            }
        });
        return enumerationObject;
    }
}
