import powerbi from 'powerbi-visuals-api';
import ValidationOptions = powerbi.ValidationOptions;
import FormattingCard = powerbi.visuals.FormattingCard;

/**
 * Provides a standard template to build visual settings from
 */
export default class SettingsBase {
    // Valid values for object enumeration
    protected validValues: {
        [propertyName: string]: string[] | ValidationOptions;
    } = {};

    public getFormattingCard = (): FormattingCard => {
        return null;
    };
}
