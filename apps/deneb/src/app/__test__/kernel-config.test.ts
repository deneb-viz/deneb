import { describe, expect, it, vi } from 'vitest';

// The editor package is mocked so this characterisation loads the visual's
// composition without pulling Monaco into the test process. Every symbol
// app-side modules import from the package must be present, or the module
// graph fails at import time rather than in an assertion. The factory
// creates its own functions because `vi.mock` is hoisted above any
// top-level binding this file declares.
vi.mock('@deneb-viz/editor', () => ({
    DenebEditor: () => null,
    RetainedDenebEditor: () => null,
    SettingsAccordionItem: () => null,
    installEditorState: vi.fn(),
    markEditorOpenStart: vi.fn(),
    spinButtonStyleSlots: {},
    useSettingsPaneTooltip: () => ({})
}));

import { installEditorState } from '@deneb-viz/editor';
import { KERNEL_CONFIG } from '../kernel-config';
import { App } from '../app';
import { VisualFormattingSettingsModel } from '../visual-settings';
import { editorPreferencesSync } from '../editor-preferences-sync';
import { I18N_TRANSLATIONS } from '../../i18n';
import { FEATURES } from '../../../config';

/**
 * Characterisation of the visual's kernel config: each field is the exact
 * app-side object the kernel is meant to receive, so a mis-wired
 * composition fails here instead of silently at runtime.
 */
describe("KERNEL_CONFIG (the visual's kernel composition)", () => {
    it("binds the visual's composed settings model class", () => {
        expect(KERNEL_CONFIG.settingsModel).toBe(VisualFormattingSettingsModel);
    });

    it("mounts the visual's App component", () => {
        expect(KERNEL_CONFIG.App).toBe(App);
    });

    it('supplies the app translation extension', () => {
        expect(KERNEL_CONFIG.translations).toBe(I18N_TRANSLATIONS);
    });

    it('derives the drilldown flag from the feature configuration', () => {
        expect(KERNEL_CONFIG.featureFlags).toEqual({
            dataDrilldown: FEATURES.data_drilldown
        });
    });

    it('contributes exactly the editor-preferences slice sync', () => {
        expect(KERNEL_CONFIG.syncSlices).toEqual([editorPreferencesSync]);
    });

    it('installs the editor state through the kernel hook', () => {
        expect(KERNEL_CONFIG.installState).toBe(installEditorState);
    });
});
