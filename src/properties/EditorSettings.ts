import powerbi from 'powerbi-visuals-api';
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import SettingsBase from './SettingsBase';
import { editorDefaults as defaults } from '../config';
import { TEditorPosition } from '../types';

/**
 * Manages data limit override preferences for the visual.
 */
export default class EditorSettings extends SettingsBase {
    // Feature enabled or not
    public position: TEditorPosition = defaults.position;
}
