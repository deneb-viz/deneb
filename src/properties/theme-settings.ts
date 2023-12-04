import powerbi from 'powerbi-visuals-api';
import VisualEnumerationInstanceKinds = powerbi.VisualEnumerationInstanceKinds;
import FormattingCard = powerbi.visuals.FormattingCard;

import SettingsBase from './settings-base';
import { getI18nValue } from '../features/i18n';
import { getIntegerSlice } from './formatting-model';
import { IIntegerSliceOptions } from './types';
import { CAPABILITIES, PROPERTY_DEFAULTS } from '../../config';

const OBJECT_NAME = 'theme';
const OBJECT_DEF = CAPABILITIES.objects[OBJECT_NAME];
const PROPERTIES = OBJECT_DEF.properties;

/**
 * Manages theme integration preferences.
 */
export default class ThemeSettings extends SettingsBase {
    // Number of discrete colors to use when computing the `pbiColorOrdinal` scheme hues
    public ordinalColorCount =
        PROPERTY_DEFAULTS.theme.ordinalColorCount.default;

    public getFormattingCard = (): FormattingCard => {
        const ORDINAL_COLOR_COUNT_SLICE: IIntegerSliceOptions = {
            displayNameKey: PROPERTIES.ordinalColorCount.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'ordinalColorCount',
            value: this.ordinalColorCount,
            minValue: PROPERTY_DEFAULTS.theme.ordinalColorCount.min,
            maxValue: PROPERTY_DEFAULTS.theme.ordinalColorCount.max,
            instanceKind: VisualEnumerationInstanceKinds.ConstantOrRule
        };
        return {
            displayName: getI18nValue(OBJECT_DEF.displayNameKey),
            description: getI18nValue(OBJECT_DEF.descriptionKey),
            uid: OBJECT_DEF.displayNameKey,
            revertToDefaultDescriptors: [ORDINAL_COLOR_COUNT_SLICE],
            groups: [
                {
                    displayName: getI18nValue(
                        `${OBJECT_DEF.displayNameKey}_Group_Ordinal`
                    ),
                    uid: `${OBJECT_DEF.displayNameKey}_Group_Ordinal`,
                    suppressDisplayName: true,
                    slices: [getIntegerSlice(ORDINAL_COLOR_COUNT_SLICE)]
                }
            ]
        };
    };
}
