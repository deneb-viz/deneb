import { describe, it, expect } from 'vitest';
// Imported from the package source (not its entry): the invariants folder is
// excluded from the host-barrel-boundary scan, so this relative reach is permitted.
import { KERNEL_I18N_TRANSLATIONS } from '../../../../../packages/powerbi-host/src/i18n';
import { SETTINGS_PANE_TRANSLATIONS } from '../../../../../packages/powerbi-host/src/i18n/settings-pane';
import appTranslations from '../../i18n/en-US.json';

/**
 * Canary: the kernel's translation extension (`KERNEL_I18N_TRANSLATIONS` from
 * the package's `src/i18n`), the shared settings pane strings the app takes
 * from the package (`SETTINGS_PANE_TRANSLATIONS`) and the app's own catalog
 * (`i18n/en-US.json`) declare no key in common.
 *
 * `VisualKernel`'s constructor merges translations as
 * `[KERNEL_I18N_TRANSLATIONS, config.translations]` (see
 * `packages/powerbi-host/src/app/visual-kernel.ts`), and the app's
 * translations spread its own catalog over the settings pane strings. Later
 * entries override earlier ones for a shared key, so a key declared twice
 * would have one string silently shadowed by another — with no error, and
 * no signal at either the point of authoring or of resolution — so this
 * canary catches the overlap at build time instead.
 */
describe('translation keys are disjoint between the kernel and app catalogs', () => {
    const catalogs = {
        kernel: Object.keys(KERNEL_I18N_TRANSLATIONS['en-US']),
        settingsPane: Object.keys(SETTINGS_PANE_TRANSLATIONS['en-US']),
        app: Object.keys(appTranslations)
    };

    it('is non-vacuous: every catalog declares at least one key', () => {
        Object.values(catalogs).forEach((keys) =>
            expect(keys.length).toBeGreaterThan(0)
        );
    });

    it('shares no key between the catalogs', () => {
        const all = Object.values(catalogs).flat();
        const overlap = all.filter((key, index) => all.indexOf(key) !== index);

        expect(overlap).toEqual([]);
    });
});
