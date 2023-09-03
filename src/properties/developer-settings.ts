import powerbi from 'powerbi-visuals-api';
import FormattingCard = powerbi.visuals.FormattingCard;

import SettingsBase from './settings-base';
import { TLocale, getI18nValue } from '../features/i18n';
import { SETTINGS_DEFAULTS, SETTINGS_OBJECTS } from '../constants';
import { getDropdownSlice, getTextSlice } from './formatting-model';
import { ITextSliceOptions } from './types';

const OBJECT_NAME = 'developer';
const OBJECT_DEF = SETTINGS_OBJECTS[OBJECT_NAME];
const PROPERTIES = OBJECT_DEF.properties;

/**
 * Manages data limit override preferences for the visual.
 */
export default class DeveloperSettings extends SettingsBase {
    // Visual version. Used to check for updates
    public version: string = null;
    // Locale override for testing formatting and i18n
    public locale: TLocale = <TLocale>SETTINGS_DEFAULTS.developer.locale;

    public getFormattingCard = (): FormattingCard => {
        const VERSION_SLICE: ITextSliceOptions = {
            displayNameKey: PROPERTIES.version.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'version',
            value: this.version,
            placeholder: ''
        };
        const LOCALE_SLICE = {
            displayNameKey: PROPERTIES.locale.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'locale',
            value: this.locale,
            items: PROPERTIES.locale.type.enumeration
        };
        return {
            displayName: getI18nValue(OBJECT_DEF.displayNameKey),
            description: getI18nValue(OBJECT_DEF.descriptionKey),
            uid: OBJECT_DEF.displayNameKey,
            groups: [
                {
                    displayName: getI18nValue(
                        `${OBJECT_DEF.displayNameKey}_Group_Version`
                    ),
                    uid: `${OBJECT_DEF.displayNameKey}_Group_Version`,
                    slices: [getTextSlice(VERSION_SLICE)]
                },
                {
                    displayName: getI18nValue(
                        `${OBJECT_DEF.displayNameKey}_Group_i18n`
                    ),
                    uid: `${OBJECT_DEF.displayNameKey}_Group_i18n`,
                    slices: [getDropdownSlice(LOCALE_SLICE)]
                }
            ]
        };
    };
}
