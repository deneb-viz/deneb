import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';
import { PROPERTIES_DEFAULTS } from '@deneb-viz/core-dependencies';

export class SettingsDisplay extends formattingSettings.CompositeCard {
    name = 'display';
    displayNameKey = 'Objects_Display';
    descriptionKey = 'Objects_Display_Description';
    scrollbars = new SettingsDisplayGroupScrollbars(Object());
    viewport = new SettingsDisplayGroupViewport(Object());
    groups = [this.scrollbars, this.viewport];
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

class SettingsDisplayGroupViewport extends formattingSettings.Group {
    name = 'viewport';
    displayNameKey = 'Objects_Display_Group_Viewport';
    viewportHeight = new formattingSettings.ReadOnlyText({
        name: 'viewportHeight',
        displayNameKey: 'Objects_Display_ViewportHeight',
        descriptionKey: 'Objects_Display_ViewportHeight_Description',
        value: PROPERTIES_DEFAULTS.display.viewportHeight
    });
    viewportWidth = new formattingSettings.ReadOnlyText({
        name: 'viewportWidth',
        displayNameKey: 'Objects_Display_ViewportWidth',
        descriptionKey: 'Objects_Display_ViewportWidth_Description',
        value: PROPERTIES_DEFAULTS.display.viewportWidth
    });
    slices = [this.viewportHeight, this.viewportWidth];
}
