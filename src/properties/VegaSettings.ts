import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import SettingsBase from './SettingsBase';
import Debugger from '../Debugger';
import { getConfig } from '../core/utils/config';
import { isHandlerEnabled } from '../api/tooltip';
import { isContextMenuEnabled, isDataPointEnabled } from '../api/selection';
import { isDeveloperModeEnabled } from '../api/developer';

const defaults = getConfig().propertyDefaults.vega;

/**
 * Manages the specification grammar and the user-provided source
 *
 * @property {string}               jsonSpec                - Visual spec
 * @property {GrammarProvider}      provider                - Grammar provider to use to render visualisation
 * @property {GrammarRenderMode}    renderMode              - How to render the visual in the DOM
 * @property {boolean}              autoSave                - Specifies whether spec is saved automatically or requires manual intervention
 * @property {boolean}              enableTooltips
 * @property {boolean}              enableContextMenu
 * @property {boolean}              enableSelection
 * @property {boolean}              isNewDialogOpen
 */
export default class VegaSettings extends SettingsBase {
    public jsonSpec: string = defaults.jsonSpec;
    public jsonConfig: string = defaults.jsonConfig;
    public provider = defaults.provider;
    public renderMode = defaults.renderMode;
    public enableTooltips = isHandlerEnabled && defaults.enableTooltips;
    public enableContextMenu =
        isContextMenuEnabled && defaults.enableContextMenu;
    public enableSelection = isDataPointEnabled && defaults.enableSelection;
    public isNewDialogOpen = defaults.isNewDialogOpen;

    /**
     * Business logic for the properties within this menu.
     * @param enumerationObject - `VisualObjectInstanceEnumerationObject` to process.
     * @param options           - any specific options we wish to pass from elsewhere in the visual that our settings may depend upon.
     */
    public processEnumerationObject(
        enumerationObject: VisualObjectInstanceEnumerationObject,
        options: {
            [propertyName: string]: any;
        } = {}
    ): VisualObjectInstanceEnumerationObject {
        Debugger.log('Processing enumeration...');
        enumerationObject.instances.map((i) => {
            if (!isDeveloperModeEnabled) {
                Debugger.log("Removing 'debug only' properties...");
                enumerationObject.instances = [];
            } else {
                Debugger.log('Handling feature switches...');
                if (!isHandlerEnabled) {
                    delete enumerationObject.instances[0].properties[
                        'enableTooltips'
                    ];
                }
                if (!isContextMenuEnabled) {
                    delete enumerationObject.instances[0].properties[
                        'enableContextMenu'
                    ];
                }
                if (!isDataPointEnabled) {
                    delete enumerationObject.instances[0].properties[
                        'enableSelection'
                    ];
                }
            }
        });
        return enumerationObject;
    }
}
