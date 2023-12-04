import powerbi from 'powerbi-visuals-api';
import FormattingCard = powerbi.visuals.FormattingCard;

import SettingsBase from './settings-base';
import { getI18nValue } from '../features/i18n';
import { getToggleSlice } from './formatting-model';
import { IToggleSliceOptions } from './types';
import { CAPABILITIES, PROPERTY_DEFAULTS } from '../../config';

const OBJECT_NAME = 'dataLimit';
const OBJECT_DEF = CAPABILITIES.objects[OBJECT_NAME];
const PROPERTIES = OBJECT_DEF.properties;

/**
 * Manages data limit override preferences for the visual.
 */
export default class DataLimitSettings extends SettingsBase {
    // Allow override of `dataReductionAlgorithm` limit.
    public override: boolean = PROPERTY_DEFAULTS.dataLimit.override;
    // Display information about the custom visual limitations and recommendations for end users.
    public showCustomVisualNotes: boolean =
        PROPERTY_DEFAULTS.dataLimit.showCustomVisualNotes;

    public getFormattingCard = (): FormattingCard => {
        const OVERRIDE_SLICE: IToggleSliceOptions = {
            displayNameKey: PROPERTIES.override.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'override',
            value: this.override
        };
        const SHOW_CUSTOM_VISUAL_NOTES_SLICE: IToggleSliceOptions = {
            displayNameKey: PROPERTIES.showCustomVisualNotes.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'showCustomVisualNotes',
            value: this.showCustomVisualNotes,
            disabled: !this.override
        };
        return {
            displayName: getI18nValue(OBJECT_DEF.displayNameKey),
            description: getI18nValue(OBJECT_DEF.descriptionKey),
            uid: OBJECT_DEF.displayNameKey,
            revertToDefaultDescriptors: [
                OVERRIDE_SLICE,
                SHOW_CUSTOM_VISUAL_NOTES_SLICE
            ],
            groups: [
                {
                    displayName: getI18nValue(
                        `${OBJECT_DEF.displayNameKey}_Group_Loading`
                    ),
                    uid: `${OBJECT_DEF.displayNameKey}_Group_Loading`,
                    slices: [
                        getToggleSlice(OVERRIDE_SLICE),
                        getToggleSlice(SHOW_CUSTOM_VISUAL_NOTES_SLICE)
                    ]
                }
            ]
        };
    };
}
