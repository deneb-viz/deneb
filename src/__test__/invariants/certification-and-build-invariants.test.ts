// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './_packages';

/**
 * Canary: certification and build-orchestration invariants that exist only as
 * prose or as load-bearing strings inside scripts, where a well-meaning edit
 * could silently break them (audit R6/R9).
 */

describe('safety-net bound is the certification ceiling', () => {
    it('SAFETY_NET_BOUND_MS is present and <= 10_000ms', () => {
        const source = readFileSync(join(REPO_ROOT, 'src', 'index.ts'), 'utf8');
        const match = source.match(/SAFETY_NET_BOUND_MS\s*=\s*([\d_]+)/);
        // Fail loud if the constant is renamed/removed rather than pass vacuously.
        if (!match) {
            throw new Error('SAFETY_NET_BOUND_MS not found in src/index.ts');
        }
        const value = Number(match[1].replace(/_/g, ''));
        expect(value).toBeLessThanOrEqual(10_000);
    });
});

describe('production `package` script ordering (audit R9)', () => {
    const pkgScript = (
        JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
            scripts: Record<string, string>;
        }
    ).scripts.package;

    it('builds packages before running webpack', () => {
        expect(pkgScript.indexOf('build:package')).toBeGreaterThanOrEqual(0);
        expect(pkgScript.indexOf('webpack:package')).toBeGreaterThan(
            pkgScript.indexOf('build:package')
        );
    });

    it('validates certification config before packaging', () => {
        expect(pkgScript).toContain('validate-config-for-commit');
        expect(pkgScript.indexOf('validate-config-for-commit')).toBeLessThan(
            pkgScript.indexOf('webpack:package')
        );
    });
});

describe('dev-with-prime resets .tmp and drives turbo (audit R6)', () => {
    const source = readFileSync(
        join(REPO_ROOT, 'bin', 'dev-with-prime.js'),
        'utf8'
    );

    it('wipes .tmp for a predictable dev start', () => {
        expect(source).toMatch(/rmSync/);
        expect(source).toContain('.tmp');
    });

    it('invokes turbo via `npx --no` so resolution is PATH-independent', () => {
        expect(source).toContain('npx --no turbo');
    });
});
