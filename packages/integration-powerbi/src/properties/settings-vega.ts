import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { CROSS_FILTER_LIMITS } from '@deneb-viz/powerbi-compat/interactivity';

export class SettingsVega extends formattingSettings.CompositeCard {
    name = 'vega';
    displayNameKey = 'Objects_Vega';
    descriptionKey = 'Objects_Vega_Description';
    output = new SettingsVegaGroupOutput(Object());
    logging = new SettingsVegaLoggingGroup(Object());
    interactivity = new SettingsVegaInteractivityGroup(Object());
    state = new SettingsVegaStateGroup(Object());
    groups = [this.output, this.logging, this.interactivity, this.state];
}

class SettingsVegaGroupOutput extends formattingSettings.Group {
    name = 'output';
    displayNameKey = 'Objects_Vega_Group_Output';
    provider = new formattingSettings.AutoDropdown({
        name: 'provider',
        displayNameKey: 'Objects_Vega_Provider',
        descriptionKey: 'Objects_Vega_Provider_Description',
        value: DEFAULTS.vega.provider
    });
    version = new formattingSettings.ReadOnlyText({
        name: 'version',
        displayNameKey: 'Objects_Vega_Version',
        descriptionKey: 'Objects_Vega_Version_Description',
        value: DEFAULTS.vega.version
    });
    jsonSpec = new formattingSettings.TextArea({
        name: 'jsonSpec',
        displayNameKey: 'Objects_Vega_JsonSpec',
        descriptionKey: 'Objects_Vega_JsonSpec_Description',
        placeholder: 'Specification JSON',
        value: DEFAULTS.vega.jsonSpec
    });
    jsonConfig = new formattingSettings.TextArea({
        name: 'jsonConfig',
        displayNameKey: 'Objects_Vega_JsonConfig',
        descriptionKey: 'Objects_Vega_JsonConfig_Description',
        placeholder: 'Config JSON',
        value: DEFAULTS.vega.jsonConfig
    });
    renderMode = new formattingSettings.AutoDropdown({
        name: 'renderMode',
        displayNameKey: 'Objects_Vega_RenderMode',
        descriptionKey: 'Objects_Vega_RenderMode_Description',
        value: DEFAULTS.vega.renderMode
    });
    slices = [
        this.provider,
        this.version,
        this.jsonSpec,
        this.jsonConfig,
        this.renderMode
    ];
}

class SettingsVegaLoggingGroup extends formattingSettings.Group {
    name = 'logging';
    displayNameKey = 'Objects_Vega_Group_Logging';
    logLevel = new formattingSettings.AutoDropdown({
        name: 'logLevel',
        displayNameKey: 'Objects_Vega_LogLevel',
        descriptionKey: 'Objects_Vega_LogLevel_Description',
        value: DEFAULTS.vega.logLevel
    });
    slices = [this.logLevel];
}

class SettingsVegaInteractivityGroup extends formattingSettings.Group {
    name = 'interactivity';
    displayNameKey = 'Objects_Vega_Group_Interactivity';
    enableTooltips = new formattingSettings.ToggleSwitch({
        name: 'enableTooltips',
        displayNameKey: 'Objects_Vega_EnableTooltips',
        descriptionKey: 'Objects_Vega_EnableTooltips_Description',
        value: DEFAULTS.vega.enableTooltips
    });
    tooltipDelay = new formattingSettings.NumUpDown({
        name: 'tooltipDelay',
        displayNameKey: 'Objects_Vega_TooltipDelay',
        descriptionKey: 'Objects_Vega_TooltipDelay_Description',
        options: {
            minValue: {
                value: 0,
                type: 0
            },
            maxValue: {
                value: 10000,
                type: 1
            }
        },
        value: DEFAULTS.vega.tooltipDelay
    });
    enableContextMenu = new formattingSettings.ToggleSwitch({
        name: 'enableContextMenu',
        displayNameKey: 'Objects_Vega_EnableContextMenu',
        descriptionKey: 'Objects_Vega_EnableContextMenu_Description',
        value: DEFAULTS.vega.enableContextMenu
    });
    enableSelection = new formattingSettings.ToggleSwitch({
        name: 'enableSelection',
        displayNameKey: 'Objects_Vega_EnableSelection',
        descriptionKey: 'Objects_Vega_EnableSelection_Description',
        value: DEFAULTS.vega.enableSelection
    });
    selectionMode = new formattingSettings.AutoDropdown({
        name: 'selectionMode',
        displayNameKey: 'Objects_Vega_SelectionMode',
        descriptionKey: 'Objects_Vega_SelectionMode_Description',
        value: DEFAULTS.vega.selectionMode
    });
    selectionMaxDataPoints = new formattingSettings.NumUpDown({
        name: 'selectionMaxDataPoints',
        displayNameKey: 'Objects_Vega_SelectionMaxDataPoints',
        descriptionKey: 'Objects_Vega_SelectionMaxDataPoints_Description',
        options: {
            minValue: {
                value: CROSS_FILTER_LIMITS.minDataPointsValue,
                type: 0
            },
            maxValue: {
                value: CROSS_FILTER_LIMITS.maxDataPointsValue,
                type: 1
            }
        },
        value: DEFAULTS.vega.selectionMaxDataPoints
    });
    enableHighlight = new formattingSettings.ToggleSwitch({
        name: 'enableHighlight',
        displayNameKey: 'Objects_Vega_EnableHighlight',
        descriptionKey: 'Objects_Vega_EnableHighlight_Description',
        value: DEFAULTS.vega.enableHighlight
    });
    slices = [
        this.enableTooltips,
        this.tooltipDelay,
        this.enableContextMenu,
        this.enableSelection,
        this.selectionMode,
        this.selectionMaxDataPoints,
        this.enableHighlight
    ];
}

class SettingsVegaStateGroup extends formattingSettings.Group {
    name = 'state';
    displayNameKey = 'Objects_Vega_Group_State';
    isNewDialogOpen = new formattingSettings.ToggleSwitch({
        name: 'isNewDialogOpen',
        displayNameKey: 'Objects_Vega_IsNewDialogOpen',
        descriptionKey: 'Objects_Vega_IsNewDialogOpen_Description',
        value: DEFAULTS.vega.isNewDialogOpen
    });
    slices = [this.isNewDialogOpen];
}
