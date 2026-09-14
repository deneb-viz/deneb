// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listWorkspacePackages } from './_packages';

/**
 * Canary: the `@deneb-viz/powerbi-compat` singleton contract (audit M15/L17).
 *
 * powerbi-compat must remain a single shared runtime instance (CLAUDE.md).
 * Every workspace package that depends on it therefore declares it as a
 * peerDependency — never a regular or dev dependency, which would let the
 * package own a private copy — and every tsdown-bundled consumer additionally
 * lists it in `deps.neverBundle` so Rolldown does not inline it (peerDeps
 * alone do not prevent bundling).
 *
 * Both halves broke silently in the wild: M15 (template-usermeta declared it as
 * a devDependency) and L17 (app-core double-declared shared packages). This
 * canary converts that class of drift into a CI failure.
 */
const SINGLETON = '@deneb-viz/powerbi-compat';

const packages = listWorkspacePackages();

// Packages that depend on powerbi-compat in any dependency map — the contract
// applies to each. powerbi-compat itself is excluded (it can't peer-depend on
// itself).
const consumers = packages.filter(
    (pkg) =>
        pkg.manifest.name !== SINGLETON &&
        [
            pkg.manifest.dependencies,
            pkg.manifest.devDependencies,
            pkg.manifest.peerDependencies
        ].some((deps) => deps && SINGLETON in deps)
);

describe('powerbi-compat singleton contract', () => {
    it('is depended on by at least one package (guards against a vacuous canary)', () => {
        expect(consumers.length).toBeGreaterThan(0);
    });

    it.each(consumers)(
        '$dir declares powerbi-compat as a peerDependency only',
        (pkg) => {
            expect(pkg.manifest.peerDependencies?.[SINGLETON]).toBeDefined();
            expect(pkg.manifest.dependencies?.[SINGLETON]).toBeUndefined();
            expect(pkg.manifest.devDependencies?.[SINGLETON]).toBeUndefined();
        }
    );

    it.each(
        consumers.filter((pkg) =>
            existsSync(join(pkg.path, 'tsdown.config.ts'))
        )
    )('$dir (tsdown-bundled) externalizes powerbi-compat', (pkg) => {
        const tsdown = readFileSync(join(pkg.path, 'tsdown.config.ts'), 'utf8');
        // Anchor to the `neverBundle` array so the check verifies placement
        // (not a bare substring that a comment could satisfy) and extract its
        // body for the sub-assertions below.
        const neverBundleMatch = tsdown.match(
            /neverBundle\s*:\s*\[([\s\S]*?)\]/
        );
        expect(neverBundleMatch).not.toBeNull();
        const neverBundleBody = neverBundleMatch?.[1] ?? '';
        // Accept either quote style for the plain package entry.
        expect(neverBundleBody).toMatch(/['"]@deneb-viz\/powerbi-compat['"]/);
        // Subpath imports (e.g. /visual-host, /signals, /theme) are covered by
        // a regex literal - tsdown does not support tsup's wildcard string
        // form (`'@deneb-viz/powerbi-compat/*'`).
        expect(neverBundleBody).toContain('@deneb-viz\\/powerbi-compat(\\/|$)');
    });
});

describe('no @deneb-viz package is double-declared (audit L17)', () => {
    it.each(packages)(
        '$dir lists no package in both dependencies and peerDependencies',
        (pkg) => {
            const deps = Object.keys(pkg.manifest.dependencies ?? {});
            const peers = new Set(
                Object.keys(pkg.manifest.peerDependencies ?? {})
            );
            expect(deps.filter((d) => peers.has(d))).toEqual([]);
        }
    );
});
