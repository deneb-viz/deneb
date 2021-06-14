import SettingsBase from './SettingsBase';
import { getConfig } from '../api/config';
import { TEditorPosition } from '../api/interface';

/**
 * Manages editor preferences for the visual.
 */
export default class EditorSettings extends SettingsBase {
    // Preferred editor position within interface
    public position: TEditorPosition = <TEditorPosition>(
        getConfig().editorDefaults.position
    );
}
