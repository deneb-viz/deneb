// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isCodePackage, listWorkspacePackages } from './_packages';

/**
 * Canary: every workspace package that ships code (has a `build` script) must
 * be linted in CI. `turbo run eslint` only runs the task in packages that
 * define it, so a package missing its `eslint` script or `eslint.config.js`
 * silently drops out of the lint gate — exactly how @deneb-viz/vega-react went
 * unlinted (audit U6 finding / handoff fact #9).
 */
const codePackages = listWorkspacePackages().filter(isCodePackage);

describe('lint coverage', () => {
    it('finds code packages (guards against a vacuous canary)', () => {
        expect(codePackages.length).toBeGreaterThan(0);
    });

    it.each(codePackages)('$dir has an eslint script', (pkg) => {
        expect(pkg.manifest.scripts?.eslint).toBeDefined();
    });

    it.each(codePackages)('$dir has an eslint.config.js', (pkg) => {
        expect(existsSync(join(pkg.path, 'eslint.config.js'))).toBe(true);
    });
});
