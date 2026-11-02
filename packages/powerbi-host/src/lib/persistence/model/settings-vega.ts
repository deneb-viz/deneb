import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { DEFAULTS } from './constants';
import { INTERACTIVITY_DEFAULTS } from '@deneb-viz/powerbi-compat/interactivity';

/**
 * Specifies the limits (and step size) for handling cross-filtering.
 */
const CROSS_FILTER_LIMITS = {
    minDataPointsValue: 1,
    maxDataPointsValue: 250,
    maxDataPointsAdvancedValue: 2500,
    dataPointsStepValue: 1
};

export class SettingsVega extends formattingSettings.CompositeCard {
    name = 'vega';
    displayNameKey = 'Objects_Vega';
    output = new SettingsVegaGroupOutput(Object());
    logging = new SettingsVegaLoggingGroup(Object());
    interactivity = new SettingsVegaInteractivityGroup(Object());
    groups = [this.output, this.logging, this.interactivity];
}

class SettingsVegaGroupOutput extends formattingSettings.Group {
    name = 'output';
    displayNameKey = 'Objects_Vega_Group_Output';
    provider = new formattingSettings.AutoDropdown({
        name: 'provider',
        displayNameKey: 'Objects_Vega_Provider',
        value: PROJECT_DEFAULTS.provider
    });
    version = new formattingSettings.ReadOnlyText({
        name: 'version',
        displayNameKey: 'Objects_Vega_Version',
        value: DEFAULTS.vega.version
    });
    jsonSpec = new formattingSettings.TextArea({
        name: 'jsonSpec',
        displayNameKey: 'Objects_Vega_JsonSpec',
        placeholder: 'Specification JSON',
        value: PROJECT_DEFAULTS.spec
    });
    jsonConfig = new formattingSettings.TextArea({
        name: 'jsonConfig',
        displayNameKey: 'Objects_Vega_JsonConfig',
        placeholder: 'Config JSON',
        value: PROJECT_DEFAULTS.config
    });
    renderMode = new formattingSettings.AutoDropdown({
        name: 'renderMode',
        displayNameKey: 'Objects_Vega_RenderMode',
        descriptionKey: 'Objects_Vega_RenderMode_Description',
        value: PROJECT_DEFAULTS.renderMode
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
        value: PROJECT_DEFAULTS.logLevel
    });
    slices = [this.logLevel];
}

export class SettingsVegaInteractivityGroup extends formattingSettings.Group {
    name = 'interactivity';
    displayNameKey = 'Objects_Vega_Group_Interactivity';
    enableTooltips = new formattingSettings.ToggleSwitch({
        name: 'enableTooltips',
        displayNameKey: 'Objects_Vega_EnableTooltips',
        descriptionKey: 'Objects_Vega_EnableTooltips_Description',
        value: INTERACTIVITY_DEFAULTS.enableTooltips
    });
    tooltipDelay = new formattingSettings.NumUpDown({
        name: 'tooltipDelay',
        displayNameKey: 'Objects_Vega_TooltipDelay',
        descriptionKey: 'Objects_Vega_TooltipDelay_Description',
        disabledReasonKey: 'Objects_Vega_TooltipDelay_DisabledReason',
        options: {
            minValue: {
                value: 0,
                type: 0
            },
            maxValue: {
                value: 10000,
                type: 1
            },
            unitSymbol: DEFAULTS.unitSymbols.milliseconds
        },
        value: DEFAULTS.vega.tooltipDelay
    });
    enableContextMenu = new formattingSettings.ToggleSwitch({
        name: 'enableContextMenu',
        displayNameKey: 'Objects_Vega_EnableContextMenu',
        descriptionKey: 'Objects_Vega_EnableContextMenu_Description',
        value: INTERACTIVITY_DEFAULTS.enableContextMenu
    });
    enableContextMenuSelector = new formattingSettings.ToggleSwitch({
        name: 'enableContextMenuSelector',
        displayNameKey: 'Objects_Vega_EnableContextMenuSelector',
        descriptionKey: 'Objects_Vega_EnableContextMenuSelector_Description',
        disabledReasonKey:
            'Objects_Vega_EnableContextMenuSelector_DisabledReason',
        value: INTERACTIVITY_DEFAULTS.enableContextMenuSelector
    });
    enableSelection = new formattingSettings.ToggleSwitch({
        name: 'enableSelection',
        displayNameKey: 'Objects_Vega_EnableSelection',
        descriptionKey: 'Objects_Vega_EnableSelection_Description',
        value: INTERACTIVITY_DEFAULTS.enableSelection
    });
    selectionMode = new formattingSettings.AutoDropdown({
        name: 'selectionMode',
        displayNameKey: 'Objects_Vega_SelectionMode',
        descriptionKey: 'Objects_Vega_SelectionMode_Description',
        value: INTERACTIVITY_DEFAULTS.selectionMode
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
        value: INTERACTIVITY_DEFAULTS.selectionMaxDataPoints
    });
    enableHighlight = new formattingSettings.ToggleSwitch({
        name: 'enableHighlight',
        displayNameKey: 'Objects_Vega_EnableHighlight',
        descriptionKey: 'Objects_Vega_EnableHighlight_Description',
        value: INTERACTIVITY_DEFAULTS.enableHighlight
    });
    slices = [
        this.enableTooltips,
        this.tooltipDelay,
        this.enableContextMenu,
        this.enableContextMenuSelector,
        this.enableSelection,
        this.selectionMode,
        this.selectionMaxDataPoints,
        this.enableHighlight
    ];
}
