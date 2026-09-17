import { HostSettingsModel } from '../lib/persistence/model/host-settings-model';
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
 * This is a type assertion, not a narrowing check: it is sound only
 * because this app is the sole binder of its own model class into the
 * formatting service (`VisualFormattingSettingsService.bind` in
 * `src/index.ts` passes `VisualFormattingSettingsModel`), so every
 * settings instance the kernel-side code hands back is actually this
 * class at runtime. Changing the bound class without updating this
 * accessor breaks that invariant silently.
 */
export const getVisualSettings = (
    settings: HostSettingsModel
): VisualFormattingSettingsModel => settings as VisualFormattingSettingsModel;
