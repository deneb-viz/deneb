import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';

export class SettingsTheme extends formattingSettings.CompositeCard {
    name = 'theme';
    displayNameKey = 'Objects_Theme';
    descriptionKey = 'Objects_Theme_Description';
    ordinal = new SettingsThemeGroupOrdinal(Object());
    groups = [this.ordinal];
}

class SettingsThemeGroupOrdinal extends formattingSettings.Group {
    name = 'ordinal';
    displayNameKey = 'Objects_DataLimit_Group_Loading';
    ordinalColorCount = new formattingSettings.NumUpDown({
        name: 'ordinalColorCount',
        displayNameKey: 'Objects_Theme_OrdinalColorCount',
        descriptionKey: 'Objects_Theme_OrdinalColorCount_Description',
        options: {
            minValue: {
                value: DEFAULTS.theme.ordinalColorCount.min,
                type: 0
            },
            maxValue: {
                value: DEFAULTS.theme.ordinalColorCount.max,
                type: 1
            }
        },
        instanceKind: 3 /* VisualEnumerationInstanceKinds.ConstantOrRule */,
        value: DEFAULTS.theme.ordinalColorCount.default
    });
    slices = [this.ordinalColorCount];
}
