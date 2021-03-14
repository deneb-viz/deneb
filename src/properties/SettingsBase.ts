import powerbi from 'powerbi-visuals-api';
import ValidationOptions = powerbi.ValidationOptions;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import Debugger from '../Debugger';

/**
 * Provides a standard template to build visual settings from
 */
export default class SettingsBase {
    // Valid values for object enumeration
    protected validValues: {
        [propertyName: string]: string[] | ValidationOptions;
    } = {};

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
            // Range validation
            Debugger.log('Range validation...');
            i.validValues = this.validValues;
        });
        return enumerationObject;
    }
}
