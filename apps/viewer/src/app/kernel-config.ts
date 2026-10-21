import { HostSettingsModel } from '@deneb-viz/powerbi-host';
import { App } from './app';
import { I18N_TRANSLATIONS } from '../i18n';
import { FEATURES } from '../../config';
import { APPLICATION_NAME, APPLICATION_VERSION } from '../lib/application';
import type { VisualKernelConfig } from '@deneb-viz/powerbi-host';

/**
 * This visual's contribution to the kernel: its settings model, root
 * component, translation extension and feature flags. There is no editor,
 * so it contributes no editor slice sync and no state-install hook.
 */
export const KERNEL_CONFIG: VisualKernelConfig = {
    application: { name: APPLICATION_NAME, version: APPLICATION_VERSION },
    settingsModel: HostSettingsModel,
    App,
    translations: I18N_TRANSLATIONS,
    featureFlags: {
        dataDrilldown: FEATURES.data_drilldown
    }
};
