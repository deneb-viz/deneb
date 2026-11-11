// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_ROOT, APPS_DIR } from './_packages';

/**
 * Canary: Deneb Runtime packages its alpha and beta channel builds with a
 * copy of this visual's channel script, because each app must package from a
 * checkout that holds only that app. The script reads only its own app's
 * files, so the copies stay identical: change both together. Skipped where
 * the viewer app is absent.
 */
const SCRIPT = join('bin', 'package-custom.ts');
const VIEWER_SCRIPT = join(APPS_DIR, 'viewer', SCRIPT);

describe('channel package script', () => {
    it.skipIf(!existsSync(VIEWER_SCRIPT))(
        "Deneb Runtime's copy matches this visual's",
        () => {
            expect(readFileSync(VIEWER_SCRIPT, 'utf8')).toBe(
                readFileSync(join(APP_ROOT, SCRIPT), 'utf8')
            );
        }
    );
});
