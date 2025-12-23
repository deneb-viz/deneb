import { DEFAULTS } from './constants';
import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

export class SettingsDeveloper extends formattingSettings.CompositeCard {
    name = 'developer';
    displayNameKey = 'Objects_Developer';
    descriptionKey = 'Objects_Developer_Description';
    versioning = new SettingsDeveloperGroupVersioning(Object());
    localization = new SettingsDeveloperGroupLocalization(Object());
    groups = [this.versioning, this.localization];
}

class SettingsDeveloperGroupVersioning extends formattingSettings.Group {
    name = 'versioning';
    displayNameKey = 'Objects_Developer_Group_Version';
    version = new formattingSettings.ReadOnlyText({
        name: 'version',
        displayNameKey: 'Objects_Developer_Version',
        descriptionKey: 'Objects_Developer_Version_Description',
        value: DEFAULTS.developer.version
    });
    slices = [this.version];
}

class SettingsDeveloperGroupLocalization extends formattingSettings.Group {
    name = 'localization';
    displayNameKey = 'Objects_Developer_Group_i18n';
    locale = new formattingSettings.AutoDropdown({
        name: 'locale',
        displayNameKey: 'Objects_Developer_Locale',
        descriptionKey: 'Objects_Developer_Locale_Description',
        value: DEFAULTS.developer.locale
    });
    slices = [this.locale];
}
