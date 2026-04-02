import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';
import { DEFAULTS } from './constants';

export class SettingsStateManagement extends formattingSettings.CompositeCard {
    name = 'stateManagement';
    displayNameKey = 'Objects_StateManagement';
    descriptionKey = 'Objects_StateManagementDisplay_Description';
    viewport = new SettingsStateManagementGroupViewport(Object());
    projectMetadata = new SettingsStateManagementGroupProjectMetadata(Object());
    groups = [this.viewport, this.projectMetadata];
}

class SettingsStateManagementGroupProjectMetadata
    extends formattingSettings.Group
{
    name = 'projectMetadata';
    displayNameKey = 'Objects_StateManagement_Group_ProjectMetadata';
    supportFieldConfiguration = new formattingSettings.ReadOnlyText({
        name: 'supportFieldConfiguration',
        displayNameKey: 'Objects_StateManagement_SupportFieldConfiguration',
        descriptionKey:
            'Objects_StateManagement_SupportFieldConfiguration_Description',
        value: DEFAULTS.stateManagement.supportFieldConfiguration
    });
    denebMetaVersion = new formattingSettings.ReadOnlyText({
        name: 'denebMetaVersion',
        displayNameKey: 'Objects_StateManagement_DenebMetaVersion',
        descriptionKey: 'Objects_StateManagement_DenebMetaVersion_Description',
        value: DEFAULTS.stateManagement.denebMetaVersion
    });
    scaleToZoom = new formattingSettings.ToggleSwitch({
        name: 'scaleToZoom',
        displayNameKey: 'Objects_StateManagement_ScaleToZoom',
        descriptionKey: 'Objects_StateManagement_ScaleToZoom_Description',
        value: DEFAULTS.stateManagement.scaleToZoom
    });
    consolidateFieldParameters = new formattingSettings.ToggleSwitch({
        name: 'consolidateFieldParameters',
        displayNameKey: 'Objects_StateManagement_ConsolidateFieldParameters',
        descriptionKey:
            'Objects_StateManagement_ConsolidateFieldParameters_Description',
        value: DEFAULTS.stateManagement.consolidateFieldParameters
    });
    slices = [
        this.supportFieldConfiguration,
        this.denebMetaVersion,
        this.scaleToZoom,
        this.consolidateFieldParameters
    ];
}

class SettingsStateManagementGroupViewport extends formattingSettings.Group {
    name = 'viewport';
    displayNameKey = 'Objects_StateManagement_Group_Viewport';
    viewportHeight = new formattingSettings.ReadOnlyText({
        name: 'viewportHeight',
        displayNameKey: 'Objects_StateManagement_ViewportHeight',
        descriptionKey: 'Objects_StateManagement_ViewportHeight_Description',
        value: DEFAULTS.stateManagement.viewportHeight
    });
    viewportWidth = new formattingSettings.ReadOnlyText({
        name: 'viewportWidth',
        displayNameKey: 'Objects_StateManagement_ViewportWidth',
        descriptionKey: 'Objects_StateManagement_ViewportWidth_Description',
        value: DEFAULTS.stateManagement.viewportWidth
    });
    slices = [this.viewportHeight, this.viewportWidth];
}
