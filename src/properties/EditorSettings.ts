import SettingsBase from './SettingsBase';
import { getConfig } from '../api/config';
import { TEditorPosition } from '../api/ui';

/**
 * Manages editor preferences for the visual.
 */
export default class EditorSettings extends SettingsBase {
    // Preferred editor position within interface
    public position: TEditorPosition = <TEditorPosition>(
        getConfig().propertyDefaults.editor.position
    );
    public fontSize: number = getConfig().propertyDefaults.editor.fontSize;
}
