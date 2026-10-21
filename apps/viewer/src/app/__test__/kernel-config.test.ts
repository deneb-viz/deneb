import { describe, expect, it } from 'vitest';

import { HostSettingsModel } from '@deneb-viz/powerbi-host';
import { KERNEL_CONFIG } from '../kernel-config';
import { App } from '../app';
import { I18N_TRANSLATIONS } from '../../i18n';
import { FEATURES } from '../../../config';
import { APPLICATION_NAME, APPLICATION_VERSION } from '../../lib/application';

/**
 * Characterisation of the visual's kernel config: each field is the exact
 * app-side object the kernel is meant to receive. Nothing is mocked: the
 * composition loads without the editor package because it never imports it.
 */
describe("KERNEL_CONFIG (the visual's kernel composition)", () => {
    it("binds the visual's settings model class", () => {
        expect(KERNEL_CONFIG.settingsModel).toBe(HostSettingsModel);
    });

    it("mounts the visual's App component", () => {
        expect(KERNEL_CONFIG.App).toBe(App);
    });

    it('supplies the app translation extension', () => {
        expect(KERNEL_CONFIG.translations).toBe(I18N_TRANSLATIONS);
    });

    it("supplies the visual's manifest name and version", () => {
        expect(KERNEL_CONFIG.application).toEqual({
            name: APPLICATION_NAME,
            version: APPLICATION_VERSION
        });
    });

    it('derives the drilldown flag from the feature configuration', () => {
        expect(KERNEL_CONFIG.featureFlags).toEqual({
            dataDrilldown: FEATURES.data_drilldown
        });
    });

    it('contributes no editor slice sync and no state-install hook', () => {
        expect(KERNEL_CONFIG.syncSlices).toBeUndefined();
        expect(KERNEL_CONFIG.installState).toBeUndefined();
    });
});
