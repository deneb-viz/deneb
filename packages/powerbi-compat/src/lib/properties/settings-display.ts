import { VISUAL_RENDER_DEFAULTS } from '@deneb-viz/configuration';
import { DEFAULTS } from './constants';
import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

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
        value: { value: VISUAL_RENDER_DEFAULTS.scrollbarColor }
    });
    scrollbarOpacity = new formattingSettings.Slider({
        name: 'scrollbarOpacity',
        displayNameKey: 'Objects_Display_ScrollbarOpacity',
        descriptionKey: 'Objects_Display_ScrollbarOpacity_Description',
        value: VISUAL_RENDER_DEFAULTS.scrollbarOpacity.default,
        options: {
            minValue: {
                value: VISUAL_RENDER_DEFAULTS.scrollbarOpacity.min,
                type: 0
            },
            maxValue: {
                value: VISUAL_RENDER_DEFAULTS.scrollbarOpacity.max,
                type: 1
            },
            unitSymbol: DEFAULTS.unitSymbols.percent
        }
    });
    scrollbarRadius = new formattingSettings.Slider({
        name: 'scrollbarRadius',
        displayNameKey: 'Objects_Display_ScrollbarRadius',
        descriptionKey: 'Objects_Display_ScrollbarRadius_Description',
        value: VISUAL_RENDER_DEFAULTS.scrollbarRadius.default,
        options: {
            minValue: {
                value: VISUAL_RENDER_DEFAULTS.scrollbarRadius.min,
                type: 0
            },
            maxValue: {
                value: VISUAL_RENDER_DEFAULTS.scrollbarRadius.max,
                type: 1
            },
            unitSymbol: DEFAULTS.unitSymbols.pixels
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
        value: VISUAL_RENDER_DEFAULTS.scrollEventThrottle.default,
        options: {
            minValue: {
                value: VISUAL_RENDER_DEFAULTS.scrollEventThrottle.min,
                type: 0
            },
            maxValue: {
                value: VISUAL_RENDER_DEFAULTS.scrollEventThrottle.max,
                type: 1
            },
            unitSymbol: DEFAULTS.unitSymbols.milliseconds
        }
    });
    slices = [this.scrollEventThrottle];
}
