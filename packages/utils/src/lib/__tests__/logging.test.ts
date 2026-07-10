import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseLogLevel } from '../logging';

describe('parseLogLevel', () => {
    it('returns a finite number input as-is', () => {
        expect(parseLogLevel(11, -1)).toBe(11);
        expect(parseLogLevel(0, -1)).toBe(0);
    });

    it('parses numeric strings', () => {
        expect(parseLogLevel('20', -1)).toBe(20);
        expect(parseLogLevel('0', -1)).toBe(0);
    });

    it('parses recognized level names (case-insensitive) and NONE synonyms', () => {
        expect(parseLogLevel('INFO', -1)).toBe(3);
        expect(parseLogLevel('info', -1)).toBe(3);
        expect(parseLogLevel('NONE', -1)).toBe(0);
        expect(parseLogLevel('off', -1)).toBe(0);
        expect(parseLogLevel('SILENT', -1)).toBe(0);
    });

    it('returns the fallback for absent, empty, or unrecognized input', () => {
        expect(parseLogLevel(undefined, -1)).toBe(-1);
        expect(parseLogLevel('', -1)).toBe(-1);
        expect(parseLogLevel('abc', -1)).toBe(-1);
        expect(parseLogLevel(NaN, -1)).toBe(-1);
    });
});

// The module-level LOG_LEVEL is resolved once at import time from
// process.env.LOG_LEVEL, so these re-import the module under a stubbed env.
describe('runtime LOG_LEVEL fail-closed (M14) + logHeading gate (L6)', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
        vi.restoreAllMocks();
    });

    const loadWith = async (logLevel: string) => {
        vi.stubEnv('LOG_LEVEL', logLevel);
        vi.resetModules();
        return import('../logging');
    };

    it('emits nothing when LOG_LEVEL is empty (falls closed to NONE, not INFO)', async () => {
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const { logInfo, logDebug } = await loadWith('');
        logInfo('x');
        logDebug('y');
        expect(info).not.toHaveBeenCalled();
        expect(debug).not.toHaveBeenCalled();
    });

    it('emits nothing when LOG_LEVEL is an unrecognized value', async () => {
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});
        const { logInfo } = await loadWith('abc');
        logInfo('x');
        expect(info).not.toHaveBeenCalled();
    });

    it('emits at an explicit level (positive control)', async () => {
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});
        const { logInfo } = await loadWith('INFO');
        logInfo('x');
        expect(info).toHaveBeenCalled();
    });

    it('logHeading is silent at NONE (L6)', async () => {
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});
        const { logHeading } = await loadWith('NONE');
        logHeading('title');
        expect(info).not.toHaveBeenCalled();
    });

    it('logHeading prints at INFO (L6)', async () => {
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});
        const { logHeading } = await loadWith('INFO');
        logHeading('title');
        expect(info).toHaveBeenCalled();
    });
});
