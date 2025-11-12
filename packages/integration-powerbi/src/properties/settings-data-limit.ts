import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';
import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

export class SettingsDataLimit extends formattingSettings.CompositeCard {
    name = 'dataLimit';
    displayNameKey = 'Objects_DataLimit';
    descriptionKey = 'Objects_DataLimit_Description';
    loading = new SettingsDataLimitGroupLoading(Object());
    groups = [this.loading];
    onPreProcess(): void {
        if (!this.loading.override.value) {
            this.loading.showCustomVisualNotes.visible = false;
        }
    }
}

class SettingsDataLimitGroupLoading extends formattingSettings.Group {
    name = 'loading';
    displayNameKey = 'Objects_DataLimit_Group_Loading';
    override = new formattingSettings.ToggleSwitch({
        name: 'override',
        displayNameKey: 'Objects_DataLimit_Override',
        descriptionKey: 'Objects_DataLimit_Override_Description',
        value: DEFAULTS.dataLimit.override
    });
    showCustomVisualNotes = new formattingSettings.ToggleSwitch({
        name: 'showCustomVisualNotes',
        displayNameKey: 'Objects_DataLimit_ShowCustomVisualNotes',
        descriptionKey: 'Objects_DataLimit_ShowCustomVisualNotes_Description',
        value: DEFAULTS.dataLimit.showCustomVisualNotes
    });
    slices = [this.override, this.showCustomVisualNotes];
}
