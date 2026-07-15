import { describe, expect, it } from 'vitest';
import { collectConfigErrors } from '../config-validation';

const env = (
    overrides: Record<string, string | undefined>
): NodeJS.ProcessEnv => overrides as NodeJS.ProcessEnv;

const hasLogLevelError = (errors: string[]) =>
    errors.some((e) => /LOG_LEVEL/.test(e));

describe('collectConfigErrors — LOG_LEVEL (M14 fail-loud)', () => {
    it('errors when LOG_LEVEL is absent', () => {
        const errors = collectConfigErrors(env({ LOG_LEVEL: undefined }));
        expect(errors.some((e) => /LOG_LEVEL is not set/.test(e))).toBe(true);
    });

    it('errors when LOG_LEVEL is empty / whitespace', () => {
        expect(
            collectConfigErrors(env({ LOG_LEVEL: '' })).some((e) =>
                /LOG_LEVEL is not set/.test(e)
            )
        ).toBe(true);
        expect(
            collectConfigErrors(env({ LOG_LEVEL: '   ' })).some((e) =>
                /LOG_LEVEL is not set/.test(e)
            )
        ).toBe(true);
    });

    it('passes an unrecognized value (resolves to 0; runtime falls closed to NONE)', () => {
        const errors = collectConfigErrors(env({ LOG_LEVEL: 'abc' }));
        expect(hasLogLevelError(errors)).toBe(false);
    });

    it('errors when LOG_LEVEL is a non-zero level', () => {
        const errors = collectConfigErrors(env({ LOG_LEVEL: '20' }));
        expect(errors.some((e) => /resolved 20/.test(e))).toBe(true);
    });

    it('passes when LOG_LEVEL is 0 or a NONE synonym', () => {
        for (const value of ['0', 'NONE', 'OFF', 'SILENT']) {
            expect(
                hasLogLevelError(collectConfigErrors(env({ LOG_LEVEL: value })))
            ).toBe(false);
        }
    });
});

describe('collectConfigErrors — dev toggles and external URIs', () => {
    const safe = { LOG_LEVEL: '0' };

    it('is clean for a certified-safe baseline', () => {
        expect(collectConfigErrors(env(safe))).toEqual([]);
    });

    it('flags each enabled dev toggle', () => {
        expect(
            collectConfigErrors(env({ ...safe, PBIVIZ_DEV_MODE: 'true' })).some(
                (e) => /PBIVIZ_DEV_MODE/.test(e)
            )
        ).toBe(true);
        expect(
            collectConfigErrors(
                env({ ...safe, ZUSTAND_DEV_TOOLS: 'true' })
            ).some((e) => /ZUSTAND_DEV_TOOLS/.test(e))
        ).toBe(true);
    });

    it('rejects ALLOW_EXTERNAL_URI unless packaging mode is standalone', () => {
        expect(
            collectConfigErrors(
                env({ ...safe, ALLOW_EXTERNAL_URI: 'true' })
            ).some((e) => /ALLOW_EXTERNAL_URI/.test(e))
        ).toBe(true);
        expect(
            collectConfigErrors(
                env({
                    ...safe,
                    ALLOW_EXTERNAL_URI: 'true',
                    DENEB_PACKAGE_MODE: 'standalone'
                })
            ).some((e) => /ALLOW_EXTERNAL_URI/.test(e))
        ).toBe(false);
    });
});

describe('collectConfigErrors — local Vega/Vega-Lite build overrides (C2)', () => {
    const safe = { LOG_LEVEL: '0' };

    it('errors when VEGA_LOCAL_PATH is set', () => {
        expect(
            collectConfigErrors(
                env({ ...safe, VEGA_LOCAL_PATH: 'C:/builds/vega/vega.js' })
            ).some((e) => /VEGA_LOCAL_PATH/.test(e))
        ).toBe(true);
    });

    it('errors when VEGA_LITE_LOCAL_PATH is set', () => {
        expect(
            collectConfigErrors(
                env({
                    ...safe,
                    VEGA_LITE_LOCAL_PATH: 'C:/builds/vega-lite/vega-lite.js'
                })
            ).some((e) => /VEGA_LITE_LOCAL_PATH/.test(e))
        ).toBe(true);
    });

    it('passes when VEGA_LOCAL_PATH / VEGA_LITE_LOCAL_PATH are empty or whitespace', () => {
        expect(
            collectConfigErrors(
                env({
                    ...safe,
                    VEGA_LOCAL_PATH: '',
                    VEGA_LITE_LOCAL_PATH: '   '
                })
            ).some((e) => /VEGA_LOCAL_PATH|VEGA_LITE_LOCAL_PATH/.test(e))
        ).toBe(false);
    });
});
