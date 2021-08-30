import SettingsBase from './SettingsBase';
import { getConfig } from '../core/utils/config';
import { TEditorPosition } from '../core/ui';

/**
 * Manages editor preferences for the visual.
 */

const defaults = getConfig().propertyDefaults.editor;

export default class EditorSettings extends SettingsBase {
    // Preferred editor position within interface
    public position: TEditorPosition = <TEditorPosition>defaults.position;
    public fontSize: number = defaults.fontSize;
    public showViewportMarker: boolean = defaults.showViewportMarker;
}
