import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';
import { PROPERTIES_DEFAULTS } from '@deneb-viz/core-dependencies';

export class SettingsDisplay extends formattingSettings.CompositeCard {
    name = 'display';
    displayNameKey = 'Objects_Display';
    descriptionKey = 'Objects_Display_Description';
    scrollbars = new SettingsDisplayGroupScrollbars(Object());
    scrollEvents = new SettingDisplayGroupScrollEvents(Object());
    groups = [this.scrollbars, this.scrollEvents];
}

class SettingsDisplayGroupScrollbars extends formattingSettings.Group {
    name = 'scrollbars';
    displayNameKey = 'Objects_Display_Group_Scrollbars';
    scrollbarColor = new formattingSettings.ColorPicker({
        name: 'scrollbarColor',
        displayNameKey: 'Objects_Display_ScrollbarColor',
        descriptionKey: 'Objects_Display_ScrollbarColor_Description',
        value: { value: PROPERTIES_DEFAULTS.display.scrollbarColor }
    });
    scrollbarOpacity = new formattingSettings.Slider({
        name: 'scrollbarOpacity',
        displayNameKey: 'Objects_Display_ScrollbarOpacity',
        descriptionKey: 'Objects_Display_ScrollbarOpacity_Description',
        value: PROPERTIES_DEFAULTS.display.scrollbarOpacity.default,
        options: {
            minValue: {
                value: PROPERTIES_DEFAULTS.display.scrollbarOpacity.min,
                type: 0
            },
            maxValue: {
                value: PROPERTIES_DEFAULTS.display.scrollbarOpacity.max,
                type: 1
            },
            unitSymbol: PROPERTIES_DEFAULTS.unitSymbols.percent
        }
    });
    scrollbarRadius = new formattingSettings.Slider({
        name: 'scrollbarRadius',
        displayNameKey: 'Objects_Display_ScrollbarRadius',
        descriptionKey: 'Objects_Display_ScrollbarRadius_Description',
        value: PROPERTIES_DEFAULTS.display.scrollbarRadius.default,
        options: {
            minValue: {
                value: PROPERTIES_DEFAULTS.display.scrollbarRadius.min,
                type: 0
            },
            maxValue: {
                value: PROPERTIES_DEFAULTS.display.scrollbarRadius.max,
                type: 1
            },
            unitSymbol: PROPERTIES_DEFAULTS.unitSymbols.pixels
        }
    });
    slices = [this.scrollbarColor, this.scrollbarOpacity, this.scrollbarRadius];
}

class SettingDisplayGroupScrollEvents extends formattingSettings.Group {
    name = 'scrollEvents';
    displayNameKey = 'Objects_Display_Group_ScrollEvents';
    scrollEventThrottle = new formattingSettings.NumUpDown({
        name: 'scrollEventThrottle',
        displayNameKey: 'Objects_Display_ScrollEventThrottle',
        descriptionKey: 'Objects_Display_ScrollEventThrottle_Description',
        value: PROPERTIES_DEFAULTS.display.scrollEventThrottle.default,
        options: {
            minValue: {
                value: PROPERTIES_DEFAULTS.display.scrollEventThrottle.min,
                type: 0
            },
            maxValue: {
                value: PROPERTIES_DEFAULTS.display.scrollEventThrottle.max,
                type: 1
            },
            unitSymbol: PROPERTIES_DEFAULTS.unitSymbols.milliseconds
        }
    });
    slices = [this.scrollEventThrottle];
}
