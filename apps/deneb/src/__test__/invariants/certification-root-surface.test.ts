// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './_packages';

/**
 * Canary: the Microsoft certification file requirements that must hold at
 * the REPOSITORY ROOT (the repo the certification team reviews): an eslint
 * script, the sanctioned `npm run package` build command, and the
 * typescript / eslint / eslint-plugin-powerbi-visuals packages installed.
 * These live in the root manifest, which no other test guards - a
 * well-meaning cleanup could drop one and only fail at submission time.
 */
const rootManifest = JSON.parse(
    readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')
) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
};

describe('certification root surface', () => {
    it('root package.json has an eslint script', () => {
        expect(rootManifest.scripts?.eslint).toBeDefined();
    });

    it('root package.json has the sanctioned package script', () => {
        expect(rootManifest.scripts?.package).toBeDefined();
    });

    it.each(['typescript', 'eslint', 'eslint-plugin-powerbi-visuals'])(
        'root devDependencies contain %s',
        (dependency) => {
            expect(rootManifest.devDependencies?.[dependency]).toBeDefined();
        }
    );
});
