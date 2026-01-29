import { INCREMENTAL_UPDATE_CONFIGURATION } from '@deneb-viz/app-core';
import { DEFAULTS } from './constants';
import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

export class SettingsDataLimit extends formattingSettings.CompositeCard {
    name = 'dataLimit';
    displayNameKey = 'Objects_DataLimit';
    descriptionKey = 'Objects_DataLimit_Description';
    loading = new SettingsDataLimitGroupLoading(Object());
    performance = new SettingsDataLimitGroupPerformance(Object());
    groups = [this.loading, this.performance];
    onPreProcess(): void {
        if (!this.loading.override.value) {
            this.loading.showCustomVisualNotes.visible = false;
        }
        if (!this.performance.enableIncrementalDataUpdates.value) {
            this.performance.incrementalUpdateThreshold.visible = false;
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

class SettingsDataLimitGroupPerformance extends formattingSettings.Group {
    name = 'performance';
    displayNameKey = 'Objects_DataLimit_Group_Performance';
    enableIncrementalDataUpdates = new formattingSettings.ToggleSwitch({
        name: 'enableIncrementalDataUpdates',
        displayNameKey: 'Objects_DataLimit_EnableIncrementalDataUpdates',
        descriptionKey:
            'Objects_DataLimit_EnableIncrementalDataUpdates_Description',
        value: INCREMENTAL_UPDATE_CONFIGURATION.enabledDefault
    });
    incrementalUpdateThreshold = new formattingSettings.NumUpDown({
        name: 'incrementalUpdateThreshold',
        displayNameKey: 'Objects_DataLimit_IncrementalUpdateThreshold',
        descriptionKey:
            'Objects_DataLimit_IncrementalUpdateThreshold_Description',
        value: INCREMENTAL_UPDATE_CONFIGURATION.defaultThreshold,
        options: {
            minValue: {
                value: INCREMENTAL_UPDATE_CONFIGURATION.minThreshold,
                type: 0
            },
            maxValue: {
                value: INCREMENTAL_UPDATE_CONFIGURATION.maxThreshold,
                type: 1
            }
        }
    });
    slices = [
        this.enableIncrementalDataUpdates,
        this.incrementalUpdateThreshold
    ];
}
