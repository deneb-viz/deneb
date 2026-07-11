import { parseLogLevel } from '@deneb-viz/utils/logging';
import { toBoolean } from '@deneb-viz/utils/type-conversion';

/**
 * Pure configuration validation for the commit/packaging gate. Given an
 * environment-like object, returns the list of issues that must be resolved
 * before a certified baseline can be committed/packaged (empty = all good).
 *
 * Kept free of I/O and `process`/`exit` side effects so it is unit-testable
 * across `.env` permutations; the CLI wrapper (`validate-config-for-commit.ts`)
 * supplies `process.env` and handles printing + exit codes.
 */
export const collectConfigErrors = (env: NodeJS.ProcessEnv): string[] => {
    const errors: string[] = [];
    const mode = env.DENEB_PACKAGE_MODE;
    // External URIs are permitted only for the standalone packaging mode.
    const allowExternalUri = mode === 'standalone';

    // Dev-only toggles: must never be enabled in committed/certified code.
    if (toBoolean(env.ZUSTAND_DEV_TOOLS)) {
        errors.push(
            '❌ .env ZUSTAND_DEV_TOOLS flag is true; this should be false.'
        );
    }
    if (toBoolean(env.PBIVIZ_DEV_MODE)) {
        errors.push(
            '❌ .env PBIVIZ_DEV_MODE flag is true; this should be false.'
        );
    }
    if (toBoolean(env.PBIVIZ_DEV_OVERLAY)) {
        errors.push(
            '❌ .env PBIVIZ_DEV_OVERLAY flag is true; this should be false.'
        );
    }
    if (toBoolean(env.PBIVIZ_VIEWPORT_GATE_OVERLAY)) {
        errors.push(
            '❌ .env PBIVIZ_VIEWPORT_GATE_OVERLAY flag is true; this should be false.'
        );
    }
    if (toBoolean(env.PBIVIZ_DEV_FORCE_READ_MODE)) {
        errors.push(
            '❌ .env PBIVIZ_DEV_FORCE_READ_MODE flag is true; this should be false.'
        );
    }

    // Log level (M14): must be present AND resolve to 0 (NONE). Absent/empty
    // fails loud so a certified build can never rely on the runtime fallback.
    // An explicit non-zero level fails too. An unrecognized value resolves to
    // the 0 fallback and passes here — which is safe, because the runtime also
    // falls closed to NONE for garbage, so no logging can ship regardless.
    const logLevelRaw = env.LOG_LEVEL;
    if (logLevelRaw === undefined || logLevelRaw.trim() === '') {
        errors.push(
            '❌ .env LOG_LEVEL is not set; it must be explicitly set to 0 (NONE) for committed baselines.'
        );
    } else {
        const level = parseLogLevel(logLevelRaw, 0);
        if (level !== 0) {
            errors.push(
                `❌ .env LOG_LEVEL is "${logLevelRaw}" (resolved ${level}); this must be 0 (NONE).`
            );
        }
    }

    // External URIs: not permitted in a certified visual; standalone only.
    if (toBoolean(env.ALLOW_EXTERNAL_URI) && !allowExternalUri) {
        errors.push(
            '❌ .env ALLOW_EXTERNAL_URI flag is true; this should be false.'
        );
    }

    return errors;
};
