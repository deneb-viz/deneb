import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import SettingsBase from './SettingsBase';
import { getConfig } from '../core/utils/config';
import { TEditorPosition } from '../core/ui';
import { TEditorProvider } from '../features/json-editor';

/**
 * Manages editor preferences for the visual.
 */

const defaults = getConfig().propertyDefaults.editor;

export default class EditorSettings extends SettingsBase {
    // Preferred editor position within interface
    public position: TEditorPosition = <TEditorPosition>defaults.position;
    public fontSize: number = defaults.fontSize;
    public wordWrap: boolean = defaults.wordWrap;
    public showGutter: boolean = defaults.showGutter;
    public showLineNumbers: boolean = defaults.showLineNumbers;
    public showViewportMarker: boolean = defaults.showViewportMarker;
    public provider: TEditorProvider = <TEditorProvider>defaults.provider;

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
        enumerationObject.instances.map((i) => {
            if (!this.showGutter) {
                delete i.properties['showLineNumbers'];
            }
        });
        return enumerationObject;
    }
}
