import SettingsBase from './SettingsBase';
import { editorDefaults as defaults } from '../config';
import { TEditorPosition } from '../types';

/**
 * Manages editor preferences for the visual.
 */
export default class EditorSettings extends SettingsBase {
    // Preferred editor position within interface
    public position: TEditorPosition = defaults.position;
}
