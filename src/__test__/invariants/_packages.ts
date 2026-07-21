import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Shared helpers for the invariant-canary suites. These read the monorepo's
 * manifests/config off disk so documented package contracts can be asserted as
 * CI failures rather than trusted as prose.
 */

/** Absolute path to the repository root (this file lives at src/__test__/invariants). */
export const REPO_ROOT = join(__dirname, '..', '..', '..');

/** Absolute path to the workspace `packages/` directory. */
export const PACKAGES_DIR = join(REPO_ROOT, 'packages');

interface Manifest {
    name?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
}

export interface WorkspacePackage {
    /** Directory name under packages/ (e.g. "vega-react"). */
    dir: string;
    /** Absolute path to the package directory. */
    path: string;
    /** Parsed package.json. */
    manifest: Manifest;
}

/** Every immediate `packages/*` directory that contains a package.json. */
export const listWorkspacePackages = (): WorkspacePackage[] =>
    readdirSync(PACKAGES_DIR)
        .map((dir) => ({ dir, path: join(PACKAGES_DIR, dir) }))
        .filter(({ path }) => existsSync(join(path, 'package.json')))
        .map(({ dir, path }) => ({
            dir,
            path,
            manifest: JSON.parse(
                readFileSync(join(path, 'package.json'), 'utf8')
            ) as Manifest
        }));

/**
 * A package ships code (as opposed to being a tooling/config-only package such
 * as eslint-config or typescript-config) when it declares a `build` script.
 */
export const isCodePackage = (pkg: WorkspacePackage): boolean =>
    Boolean(pkg.manifest.scripts?.build);
