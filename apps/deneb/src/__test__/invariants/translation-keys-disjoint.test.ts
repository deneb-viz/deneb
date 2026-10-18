import { describe, it, expect } from 'vitest';
// Imported from the package source (not its entry): the invariants folder is
// excluded from the host-barrel-boundary scan, so this relative reach is permitted.
import { KERNEL_I18N_TRANSLATIONS } from '../../../../../packages/powerbi-host/src/i18n';
import appTranslations from '../../i18n/en-US.json';

/**
 * Canary: the kernel's translation extension (`KERNEL_I18N_TRANSLATIONS` from
 * the package's `src/i18n`) and the app's own catalog (`i18n/en-US.json`) declare no key in common.
 *
 * `VisualKernel`'s constructor merges translations as
 * `[KERNEL_I18N_TRANSLATIONS, config.translations]` (see
 * `packages/powerbi-host/src/app/visual-kernel.ts`), and later entries in that list override
 * earlier ones for a shared key. A key declared in both catalogs would
 * therefore have its kernel-side string silently shadowed by the app's —
 * with no error, and no signal at either the point of authoring or of
 * resolution — so this canary catches the overlap at build time instead.
 */
describe('translation keys are disjoint between the kernel and app catalogs', () => {
    const kernelKeys = Object.keys(KERNEL_I18N_TRANSLATIONS['en-US']);
    const appKeys = Object.keys(appTranslations);

    it('is non-vacuous: both catalogs declare at least one key', () => {
        expect(kernelKeys.length).toBeGreaterThan(0);
        expect(appKeys.length).toBeGreaterThan(0);
    });

    it('shares no key between the kernel and app catalogs', () => {
        const appKeySet = new Set(appKeys);
        const overlap = kernelKeys.filter((key) => appKeySet.has(key));

        expect(overlap).toEqual([]);
    });
});
