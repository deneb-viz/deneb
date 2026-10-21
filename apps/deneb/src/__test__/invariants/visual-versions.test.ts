// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_ROOT, APPS_DIR } from './_packages';

/**
 * Canary: the viewer-only build's version tracks this visual's. Both ship
 * from the same workspace packages and share the kernel's version-keyed
 * migrations, so their versions move together. Skipped where the viewer app
 * is absent.
 */
const VIEWER_PBIVIZ = join(APPS_DIR, 'viewer', 'pbiviz.json');

const readVersion = (path: string): string =>
    (JSON.parse(readFileSync(path, 'utf8')) as { visual: { version: string } })
        .visual.version;

describe('visual versions', () => {
    it.skipIf(!existsSync(VIEWER_PBIVIZ))(
        "the viewer-only build's version matches this visual's",
        () => {
            expect(readVersion(VIEWER_PBIVIZ)).toBe(
                readVersion(join(APP_ROOT, 'pbiviz.json'))
            );
        }
    );
});
