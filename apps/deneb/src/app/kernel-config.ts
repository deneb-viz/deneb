import { installEditorState } from '@deneb-viz/editor';
import { App } from './app';
import { VisualFormattingSettingsModel } from './visual-settings';
import { editorPreferencesSync } from './editor-preferences-sync';
import { I18N_TRANSLATIONS } from '../i18n';
import { FEATURES } from '../../config';
import { APPLICATION_NAME, APPLICATION_VERSION } from '../lib/application';
import type { VisualKernelConfig } from '@deneb-viz/powerbi-host';

/**
 * This visual's contribution to the kernel: its settings model, root
 * component, translation extension, feature flags, editor-preferences
 * slice sync, and the retained-editor state-install hook.
 */
export const KERNEL_CONFIG: VisualKernelConfig = {
    application: { name: APPLICATION_NAME, version: APPLICATION_VERSION },
    settingsModel: VisualFormattingSettingsModel,
    App,
    translations: I18N_TRANSLATIONS,
    featureFlags: {
        dataDrilldown: FEATURES.data_drilldown
    },
    syncSlices: [editorPreferencesSync],
    installState: installEditorState
};
