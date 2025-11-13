import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

import { SettingsDataLimit } from './settings-data-limit';
import { SettingsDeveloper } from './settings-developer';
import { SettingsDisplay } from './settings-display';
import { SettingsGeneral } from './settings-general';
import { SettingsTheme } from './settings-theme';
import { SettingsVega } from './settings-vega';
import { SettingsEditor } from './settings-editor';
import { SettingsStateManagement } from './settings-state-management';

/**
 * Master formatting model for the Power BI formatting pane.
 */
export class VisualFormattingSettingsModel extends formattingSettings.Model {
    general = new SettingsGeneral();
    editor = new SettingsEditor();
    theme = new SettingsTheme();
    dataLimit = new SettingsDataLimit();
    display = new SettingsDisplay();
    vega = new SettingsVega();
    stateManagement = new SettingsStateManagement();
    developer = new SettingsDeveloper();
    cards = [
        this.editor,
        this.theme,
        this.display,
        this.dataLimit,
        this.stateManagement,
        this.vega,
        this.developer
    ];
    /**
     * Check/resolve card visibility based on developer settings.
     */
    resolveDeveloperSettings = (developerMode: boolean) => {
        if (!developerMode) {
            this.developer.visible = false;
            this.vega.visible = false;
            this.stateManagement.visible = false;
        }
    };
}
