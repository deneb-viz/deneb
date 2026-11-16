import {
    PROJECT_DEFAULTS,
    VISUAL_RENDER_DEFAULTS
} from '@deneb-viz/configuration';
import { DEFAULTS } from './constants';
import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';
import { onObject } from './slice-on-object';

export class SettingsDisplay extends formattingSettings.CompositeCard {
    name = 'display';
    displayNameKey = 'Objects_Display';
    descriptionKey = 'Objects_Display_Description';
    rendering = new SettingsDisplayGroupRendering(Object());
    scrollbars = new SettingsDisplayGroupScrollbars(Object());
    scrollEvents = new SettingDisplayGroupScrollEvents(Object());
    groups = [this.rendering, this.scrollbars, this.scrollEvents];
    onPreProcess(): void {
        this.rendering.scaleToZoom.disabled =
            this.rendering.renderMode.value !== 'canvas';
    }
}

const VegaAutoDropdown = onObject(formattingSettings.AutoDropdown, 'vega');
const StateManagementToggleSwitch = onObject(
    formattingSettings.ToggleSwitch,
    'stateManagement'
);

/**
 * Render mode and scale to report zoom, grouped as Deneb's settings pane
 * groups them. Both are stored on other objects than this card's. Hidden
 * unless the visual shows its author settings
 * (`HostSettingsModel.showAuthorSettings`), because a hidden group is left
 * out of the card's reset too.
 */
class SettingsDisplayGroupRendering extends formattingSettings.Group {
    name = 'rendering';
    displayNameKey = 'Objects_Display_Group_Rendering';
    visible = false;
    renderMode = new VegaAutoDropdown({
        name: 'renderMode',
        displayNameKey: 'Objects_Vega_RenderMode',
        descriptionKey: 'Objects_Vega_RenderMode_Description',
        value: PROJECT_DEFAULTS.renderMode
    });
    scaleToZoom = new StateManagementToggleSwitch({
        name: 'scaleToZoom',
        displayNameKey: 'Objects_StateManagement_ScaleToZoom',
        descriptionKey: 'Objects_StateManagement_ScaleToZoom_Description',
        disabledReasonKey: 'Objects_StateManagement_ScaleToZoom_DisabledReason',
        value: DEFAULTS.stateManagement.scaleToZoom
    });
    slices = [this.renderMode, this.scaleToZoom];
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
    scrollbarWidth = new formattingSettings.Slider({
        name: 'scrollbarWidth',
        displayNameKey: 'Objects_Display_ScrollbarWidth',
        descriptionKey: 'Objects_Display_ScrollbarWidth_Description',
        value: VISUAL_RENDER_DEFAULTS.scrollbarWidth.default,
        options: {
            minValue: {
                value: VISUAL_RENDER_DEFAULTS.scrollbarWidth.min,
                type: 0
            },
            maxValue: {
                value: VISUAL_RENDER_DEFAULTS.scrollbarWidth.max,
                type: 1
            },
            unitSymbol: DEFAULTS.unitSymbols.pixels
        }
    });
    slices = [
        this.scrollbarColor,
        this.scrollbarOpacity,
        this.scrollbarRadius,
        this.scrollbarWidth
    ];
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
