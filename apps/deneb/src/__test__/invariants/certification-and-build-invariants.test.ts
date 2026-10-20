// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_ROOT, listWorkspacePackages } from './_packages';

/**
 * Canary: certification and build-orchestration invariants that exist only as
 * prose or as load-bearing strings inside scripts, where a well-meaning edit
 * could silently break them.
 */

describe('production `package` script ordering', () => {
    const pkgScript = (
        JSON.parse(readFileSync(join(APP_ROOT, 'package.json'), 'utf8')) as {
            scripts: Record<string, string>;
        }
    ).scripts.package;
    // Fail loud if the script is renamed/removed rather than let the indexOf
    // checks below throw an opaque TypeError (mirrors the SAFETY_NET_BOUND_MS
    // guard above).
    if (!pkgScript) {
        throw new Error('scripts.package not found in package.json');
    }

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

describe('dev-with-prime resets .tmp and drives turbo', () => {
    const source = readFileSync(
        join(APP_ROOT, 'bin', 'dev-with-prime.js'),
        'utf8'
    );

    it('wipes .tmp for a predictable dev start', () => {
        expect(source).toMatch(/rmSync/);
        expect(source).toContain('.tmp');
    });

    it('invokes turbo via `npx --no` so resolution is PATH-independent', () => {
        expect(source).toContain('npx --no turbo');
    });

    it('runs turbo over the visual and the workspace packages it depends on', () => {
        expect(source).toContain('--filter=@deneb-viz/deneb...');
    });
});

describe("package build covers the visual's dependency closure", () => {
    const manifest = JSON.parse(
        readFileSync(join(APP_ROOT, 'package.json'), 'utf8')
    ) as {
        scripts: Record<string, string>;
        devDependencies?: Record<string, string>;
    };
    const declared = new Set(Object.keys(manifest.devDependencies ?? {}));

    it('builds the visual and the workspace packages it depends on, naming no other workspace', () => {
        expect(manifest.scripts['build:package']).toContain(
            '--filter=@deneb-viz/deneb...'
        );
        expect(manifest.scripts['build:package']).not.toContain('--filter=!');
    });

    // turbo orders builds by dependencies and devDependencies only, so a
    // workspace peer the visual supplies but does not declare is never built
    // ahead of the visual.
    it('declares every workspace peer of the packages it depends on', () => {
        const peers = listWorkspacePackages()
            .filter((pkg) => declared.has(pkg.manifest.name ?? ''))
            .flatMap((pkg) => Object.keys(pkg.manifest.peerDependencies ?? {}))
            .filter((name) => name.startsWith('@deneb-viz/'));
        expect(peers.length).toBeGreaterThan(0);
        expect(
            [...new Set(peers)].filter((name) => !declared.has(name))
        ).toEqual([]);
    });
});
