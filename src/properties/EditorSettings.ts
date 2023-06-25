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
    // JSON editor font size
    public fontSize: number = defaults.fontSize;
    // Whether to wrap text in the JSON editor or not
    public wordWrap: boolean = defaults.wordWrap;
    // Show the gutter in the JSON editor
    public showGutter: boolean = defaults.showGutter;
    // Show line numbers in the JSON Editor
    public showLineNumbers: boolean = defaults.showLineNumbers;
    // Show viewport marker in editor
    public showViewportMarker: boolean = defaults.showViewportMarker;
    // Specified provider (Vega or Vega-Lite)
    public provider: TEditorProvider = <TEditorProvider>defaults.provider;
    // Show scrollbars in advanced editor preview area
    public previewScrollbars: boolean = defaults.previewScrollbars;

    /**
     * Business logic for the properties within this menu.
     * @param enumerationObject - `VisualObjectInstanceEnumerationObject` to process.
     */
    public processEnumerationObject(
        enumerationObject: VisualObjectInstanceEnumerationObject
    ): VisualObjectInstanceEnumerationObject {
        enumerationObject.instances.map((i) => {
            if (!this.showGutter) {
                delete i.properties['showLineNumbers'];
            }
        });
        return enumerationObject;
    }
}
