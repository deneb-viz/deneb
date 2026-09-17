import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

import { SettingsDataLimit } from './settings-data-limit';
import { SettingsDeveloper } from './settings-developer';
import { SettingsDisplay } from './settings-display';
import { SettingsGeneral } from './settings-general';
import { SettingsVega } from './settings-vega';
import { SettingsStateManagement } from './settings-state-management';

/**
 * Generic formatting-pane model shared by every composition of Deneb's
 * settings: the cards and developer-mode visibility rules that carry no
 * app-contributed card (e.g. the editor). Kernel-side code (persistence,
 * migration, dataset and display-mode helpers) types against this class
 * so it stays agnostic to which cards an app composes on top of it.
 */
export class HostSettingsModel extends formattingSettings.Model {
    general = new SettingsGeneral();
    dataLimit = new SettingsDataLimit();
    display = new SettingsDisplay();
    vega = new SettingsVega();
    stateManagement = new SettingsStateManagement();
    developer = new SettingsDeveloper();

    /**
     * The generic cards, in pane order, excluding `general` (a field, not
     * a formatting-pane card) and excluding any app-contributed card. A
     * subclass composes its own `cards` from this list (typically
     * prepending its own cards) so the generic ordering is never
     * hand-duplicated.
     */
    genericCards: formattingSettings.Cards[] = [
        this.display,
        this.dataLimit,
        this.stateManagement,
        this.vega,
        this.developer
    ];

    cards: formattingSettings.Cards[] = this.genericCards;

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
