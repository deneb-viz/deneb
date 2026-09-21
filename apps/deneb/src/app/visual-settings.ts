import { HostSettingsModel } from '../host';
import { SettingsEditor } from './settings-editor';

/**
 * The visual's composed formatting-pane model: this app's editor card
 * first, followed by the generic host cards, matching the long-standing
 * formatting-pane order (editor, display, dataLimit, stateManagement,
 * vega, developer).
 */
export class VisualFormattingSettingsModel extends HostSettingsModel {
    editor = new SettingsEditor();
    cards = [this.editor, ...this.genericCards];
}

/**
 * Narrows a base `HostSettingsModel` to this app's
 * `VisualFormattingSettingsModel` so editor-card properties can be read.
 *
 * This is a checked narrowing, not a plain assertion: it is sound only
 * because this app is the sole binder of its own model class into the
 * formatting service (the kernel calls
 * `VisualFormattingSettingsService.bind` with `config.settingsModel`, and
 * `src/app/kernel-config.ts` supplies `VisualFormattingSettingsModel`), so
 * every settings instance the kernel-side code hands back is actually this
 * class at runtime. The `'editor' in settings` check exists so a mis-bound
 * class (someone changes `config.settingsModel` without keeping the editor
 * card) fails loudly at the first read here, instead of surfacing later as
 * `undefined` deep inside an editor-card subscriber.
 */
export const getVisualSettings = (
    settings: HostSettingsModel
): VisualFormattingSettingsModel => {
    if (!('editor' in settings)) {
        throw new Error(
            'getVisualSettings: the bound settings model is missing the editor card. The formatting service must be bound with VisualFormattingSettingsModel (see src/app/kernel-config.ts).'
        );
    }
    return settings as VisualFormattingSettingsModel;
};
