import { type formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { HostSettingsModel } from '@deneb-viz/powerbi-host';
import { ViewerInteractivityCard } from './interactivity-card';
import { ViewerTemplateCard } from './template-card';

/**
 * The visual's format pane: the template, interactivity and rendering,
 * display and data limit settings.
 *
 * The host's `vega`, `stateManagement` and `developer` cards stay in `cards`
 * because only listed cards are populated from the saved properties, and
 * shared code reads the template's spec, config and provider from them.
 * They are always hidden, in developer mode too, so the format pane never
 * shows the spec or internal state.
 */
export class ViewerSettingsModel extends HostSettingsModel {
    viewerTemplate = new ViewerTemplateCard(
        () => this.vega.output.jsonSpec.value !== PROJECT_DEFAULTS.spec
    );
    viewerInteractivity = new ViewerInteractivityCard(() =>
        this.vega.output.provider.value?.toString()
    );
    cards: formattingSettings.Cards[] = [
        this.viewerTemplate,
        this.viewerInteractivity,
        this.display,
        this.dataLimit,
        this.vega,
        this.stateManagement,
        this.developer
    ];
    resolveDeveloperSettings = () => {
        this.vega.visible = false;
        this.stateManagement.visible = false;
        this.developer.visible = false;
    };

    constructor() {
        super();
        this.resolveDeveloperSettings();
    }
}
