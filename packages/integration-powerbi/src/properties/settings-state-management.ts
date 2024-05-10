import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';
import { PROPERTIES_DEFAULTS } from '@deneb-viz/core-dependencies';

export class SettingsStateManagement extends formattingSettings.CompositeCard {
    name = 'stateManagement';
    displayNameKey = 'Objects_StateManagement';
    descriptionKey = 'Objects_StateManagementDisplay_Description';
    viewport = new SettingsStateManagementGroupViewport(Object());
    groups = [this.viewport];
}

class SettingsStateManagementGroupViewport extends formattingSettings.Group {
    name = 'viewport';
    displayNameKey = 'Objects_StateManagement_Group_Viewport';
    viewportHeight = new formattingSettings.ReadOnlyText({
        name: 'viewportHeight',
        displayNameKey: 'Objects_StateManagement_ViewportHeight',
        descriptionKey: 'Objects_StateManagement_ViewportHeight_Description',
        value: PROPERTIES_DEFAULTS.stateManagement.viewportHeight
    });
    viewportWidth = new formattingSettings.ReadOnlyText({
        name: 'viewportWidth',
        displayNameKey: 'Objects_StateManagement_ViewportWidth',
        descriptionKey: 'Objects_StateManagement_ViewportWidth_Description',
        value: PROPERTIES_DEFAULTS.stateManagement.viewportWidth
    });
    slices = [this.viewportHeight, this.viewportWidth];
}
