// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { APP_ROOT, walkFiles } from './_packages';

/**
 * Canary: app-side code reaches kernel-side code only through the
 * transitional host barrel (`src/host.ts`), and kernel-side code never
 * imports the barrel or app-side code.
 *
 * "Kernel-side" is the reusable Power BI host kernel (`kernel/`, `lib/`,
 * `state/`, the dev-overlay features, the generic status components, the
 * test harness); "app-side" is what is specific to this visual (`app/`,
 * `i18n/`, the settings/toaster features, the entry, and the landing-page
 * components). `host.ts` itself is neither — it is the seam between the
 * two, so it is exempt from both rules below (it is EXPECTED to import
 * from every kernel-side folder; nothing may import it back into the
 * kernel side).
 *
 * A flat specifier scan in the style of `editor-import-specifiers.test.ts`,
 * with the detection logic factored into a pure function so it can be
 * exercised against synthetic fixtures without touching disk.
 */

/** Patterns identifying a kernel-side file or import-specifier target. */
const KERNEL_SIDE_PATTERNS: RegExp[] = [
    /^kernel(\/|$)/,
    /^lib(\/|$)/,
    /^state(\/|$)/,
    /^features\/dev-overlay-shell(\/|$)/,
    /^features\/viewport-gate-debug-overlay(\/|$)/,
    /^features\/visual-update-history-overlay(\/|$)/,
    /^__test__\/harness(\/|$)/,
    /^features\/status\/components\/index(\.tsx?)?$/,
    /^features\/status\/components\/status-container(\.tsx?)?$/,
    /^features\/status\/components\/status-stack-item(\.tsx?)?$/,
    /^features\/status\/components\/progress(\.tsx?)?$/,
    /^features\/status\/components\/splash-initial(\.tsx?)?$/,
    /^features\/status\/components\/fetching-message(\.tsx?)?$/
];

/** Patterns identifying an app-side file or import-specifier target. */
const APP_SIDE_PATTERNS: RegExp[] = [
    /^index(\.ts)?$/,
    /^app(\/|$)/,
    /^i18n(\/|$)/,
    /^features\/settings(\/|$)/,
    /^features\/toaster(\/|$)/,
    /^features\/status\/index(\.ts)?$/,
    /^features\/status\/components\/landing-page.*(\.tsx)?$/
];

/** The barrel itself — exempt from both rules (see file docblock). */
const HOST_BARREL_PATTERN = /^host(\.ts)?$/;

export type Side = 'app' | 'kernel' | 'other';

/** Classifies a repo-relative (or import-tail) path fragment by side. */
export function classifySide(pathFragment: string): Side {
    const normalized = pathFragment.replace(/\\/g, '/');
    if (KERNEL_SIDE_PATTERNS.some((pattern) => pattern.test(normalized))) {
        return 'kernel';
    }
    if (APP_SIDE_PATTERNS.some((pattern) => pattern.test(normalized))) {
        return 'app';
    }
    return 'other';
}

/**
 * Resolves a relative import specifier, written inside `fromFile`, to a
 * `src`-relative path fragment comparable against {@link classifySide}'s
 * patterns. Resolution is anchored at a synthetic root (`src/` is treated
 * as filesystem root `/`) and clamped there: a specifier climbing above
 * `src/` (e.g. an illustrative `../../../lib/interactivity` written from
 * a file only two directories deep) resolves as far up as the root and no
 * further, matching how `path.resolve` treats excess `..` on an absolute
 * path, rather than accumulating leading `..` the way `path.join` would
 * on a bare relative path. This is what makes the scan correct for a
 * kernel-side file's OWN nested folder of the same name as a top-level
 * one — e.g. `state/state.ts`'s `'./host'` resolves to `state/host` (the
 * host state slice), not the root `host` barrel, because resolution is
 * anchored at the importing file's real directory.
 *
 * A bare `.`/`./` specifier (importing the current directory's index)
 * resolves to that directory. Returns `undefined` for a non-relative
 * (package) specifier, which this canary does not police.
 */
export function specifierTail(
    fromFile: string,
    specifier: string
): string | undefined {
    if (!specifier.startsWith('.')) {
        return undefined;
    }
    const fromDir = posixDirname(fromFile);
    const isIndexImport =
        specifier === '.' || specifier === './' || specifier.endsWith('/');
    const resolved = posixResolveClamped(fromDir, specifier);
    return isIndexImport ? `${resolved}/index` : resolved;
}

/** POSIX `dirname`, independent of the host OS's path module. */
function posixDirname(filePath: string): string {
    const lastSlash = filePath.lastIndexOf('/');
    return lastSlash === -1 ? '' : filePath.slice(0, lastSlash);
}

/**
 * Joins `fromDir` and `specifier` as if `fromDir` were rooted at `/`, then
 * resolves `.`/`..` segments the way `path.resolve` would for an absolute
 * path — climbing above the root simply stays at the root rather than
 * producing a leading `..`. Returns the result without its leading slash.
 */
function posixResolveClamped(fromDir: string, specifier: string): string {
    const combined = `${fromDir}/${specifier}`;
    const segments = combined.split('/');
    const stack: string[] = [];
    for (const segment of segments) {
        if (segment === '' || segment === '.') {
            continue;
        }
        if (segment === '..') {
            stack.pop();
            continue;
        }
        stack.push(segment);
    }
    return stack.join('/');
}

export interface ImportEntry {
    /** Repo-relative (to `apps/deneb/src`), forward-slash path of the importing file. */
    file: string;
    /** Every import specifier found in the file. */
    specifiers: string[];
}

export interface BoundaryViolation {
    file: string;
    specifier: string;
    reason: string;
}

/**
 * Pure detection function: given (file, specifiers) entries, reports
 * every host-barrel boundary violation. Exported so fixtures can drive it
 * directly without a filesystem.
 */
export function findHostBarrelBoundaryViolations(
    entries: readonly ImportEntry[]
): BoundaryViolation[] {
    const violations: BoundaryViolation[] = [];
    for (const { file, specifiers } of entries) {
        const fileSide = classifySide(file);
        if (fileSide === 'other') {
            continue;
        }
        for (const specifier of specifiers) {
            const tail = specifierTail(file, specifier);
            if (tail === undefined) {
                continue;
            }
            const isHostBarrel = HOST_BARREL_PATTERN.test(tail);
            const targetSide = classifySide(tail);
            if (fileSide === 'app' && targetSide === 'kernel') {
                violations.push({
                    file,
                    specifier,
                    reason: 'app-side file imports a kernel-side module by relative path instead of through the host barrel'
                });
            } else if (fileSide === 'kernel' && isHostBarrel) {
                violations.push({
                    file,
                    specifier,
                    reason: 'kernel-side file imports the host barrel'
                });
            } else if (fileSide === 'kernel' && targetSide === 'app') {
                violations.push({
                    file,
                    specifier,
                    reason: 'kernel-side file imports an app-side module'
                });
            }
        }
    }
    return violations;
}

/**
 * Extracts every import specifier from a source file's text: standard
 * `import ... from '...'` (including type-only and re-export forms, which
 * also contain `from`), bare side-effect imports (`import '...';`, no
 * bindings and no `from`), and dynamic imports (`import('...')`). All three
 * are real ways a kernel-side module could reach the host barrel — or an
 * app-side module could reach kernel-side code — without going through a
 * `from` clause, so a scan that only matched `from` would miss them.
 */
const importSpecifiers = (source: string): string[] => [
    ...[...source.matchAll(/from\s*['"]([^'"]+)['"]/g)].map(
        (match) => match[1]
    ),
    ...[...source.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm)].map(
        (match) => match[1]
    ),
    ...[...source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(
        (match) => match[1]
    )
];

/** Every non-test TypeScript source file under apps/deneb/src, as import entries. */
const SRC_ROOT = join(APP_ROOT, 'src');
const realEntries: ImportEntry[] = walkFiles(SRC_ROOT)
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .filter((file) => !/__test__|\.test\./.test(file))
    .map((file) => ({
        file: relative(SRC_ROOT, file).split(sep).join('/'),
        specifiers: importSpecifiers(readFileSync(file, 'utf8'))
    }));

describe('host barrel boundary', () => {
    it('scans a non-trivial number of source files (guards against a vacuous canary)', () => {
        expect(realEntries.length).toBeGreaterThan(20);
    });

    it('finds no boundary violation among the real, non-test source files', () => {
        const violations = findHostBarrelBoundaryViolations(realEntries);

        if (violations.length > 0) {
            console.error(
                `Found ${violations.length} host-barrel boundary violation(s):\n` +
                    violations
                        .map(
                            (v) =>
                                `  ${v.file} imports "${v.specifier}" — ${v.reason}`
                        )
                        .join('\n')
            );
        }

        expect(violations).toEqual([]);
    });

    describe('findHostBarrelBoundaryViolations (pure function)', () => {
        it('flags an app-side file importing a kernel-side module directly', () => {
            const violations = findHostBarrelBoundaryViolations([
                {
                    file: 'features/settings/x.tsx',
                    specifiers: ['../../../lib/interactivity']
                }
            ]);
            expect(violations).toHaveLength(1);
            expect(violations[0]).toMatchObject({
                file: 'features/settings/x.tsx',
                specifier: '../../../lib/interactivity'
            });
        });

        it('flags a kernel-side file importing the host barrel', () => {
            const violations = findHostBarrelBoundaryViolations([
                { file: 'lib/x.ts', specifiers: ['../host'] }
            ]);
            expect(violations).toHaveLength(1);
            expect(violations[0]).toMatchObject({
                file: 'lib/x.ts',
                specifier: '../host'
            });
        });

        it('passes an app-side file importing the host barrel', () => {
            const violations = findHostBarrelBoundaryViolations([
                { file: 'app/x.ts', specifiers: ['../host'] }
            ]);
            expect(violations).toEqual([]);
        });

        it('passes app-side-to-app-side and kernel-side-to-kernel-side relative imports', () => {
            const violations = findHostBarrelBoundaryViolations([
                { file: 'app/x.ts', specifiers: ['./y', '../i18n'] },
                { file: 'lib/x.ts', specifiers: ['../state', './y'] }
            ]);
            expect(violations).toEqual([]);
        });

        it('passes package (non-relative) specifiers regardless of side', () => {
            const violations = findHostBarrelBoundaryViolations([
                {
                    file: 'features/settings/x.tsx',
                    specifiers: ['@deneb-viz/app-core', 'react']
                },
                { file: 'lib/x.ts', specifiers: ['@deneb-viz/app-core'] }
            ]);
            expect(violations).toEqual([]);
        });

        it('flags a kernel-side file importing an app-side folder', () => {
            const violations = findHostBarrelBoundaryViolations([
                { file: 'lib/x.ts', specifiers: ['../../app/visual-settings'] }
            ]);
            expect(violations).toHaveLength(1);
            expect(violations[0]).toMatchObject({
                file: 'lib/x.ts',
                specifier: '../../app/visual-settings'
            });
        });

        it('flags an app-side bare (side-effect) import of a kernel-side module', () => {
            const violations = findHostBarrelBoundaryViolations([
                {
                    file: 'features/settings/x.tsx',
                    specifiers: importSpecifiers(
                        "import '../../lib/interactivity';\n"
                    )
                }
            ]);
            expect(violations).toHaveLength(1);
            expect(violations[0]).toMatchObject({
                file: 'features/settings/x.tsx',
                specifier: '../../lib/interactivity'
            });
        });

        it('flags a kernel-side dynamic import of the host barrel', () => {
            const violations = findHostBarrelBoundaryViolations([
                {
                    file: 'lib/x.ts',
                    specifiers: importSpecifiers(
                        "const mod = await import('../host');\n"
                    )
                }
            ]);
            expect(violations).toHaveLength(1);
            expect(violations[0]).toMatchObject({
                file: 'lib/x.ts',
                specifier: '../host'
            });
        });

        it('ignores a file outside both classifications (e.g. host.ts itself)', () => {
            const violations = findHostBarrelBoundaryViolations([
                {
                    file: 'host.ts',
                    specifiers: [
                        './lib/interactivity',
                        './kernel/visual-kernel'
                    ]
                }
            ]);
            expect(violations).toEqual([]);
        });
    });
});
