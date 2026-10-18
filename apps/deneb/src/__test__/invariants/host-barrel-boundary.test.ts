// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { APP_ROOT, walkFiles } from './_packages';

/**
 * Canary: the visual reaches the Power BI host kernel only through the
 * bare package specifier `@deneb-viz/powerbi-host`.
 *
 * Two rules hold for every app source file (the invariant suites in this
 * folder are excluded because they contain illustrative specifiers as
 * string fixtures):
 *
 * 1. No import uses a deep path under the package specifier
 *    (`@deneb-viz/powerbi-host/...`); the package exports only `.`.
 * 2. No relative import climbs out of the app root (`apps/deneb`), which
 *    would be a reach into another workspace's sources. Relative imports
 *    that stay inside `apps/deneb` (including `config/` and `style/` beside
 *    `src/`) are ordinary in-app code.
 *
 * With both rules holding, the bare specifier is the only route to the
 * kernel. A flat specifier scan in the style of
 * `editor-import-specifiers.test.ts`, with the detection logic factored
 * into a pure function so it can be exercised against synthetic fixtures
 * without touching disk.
 */

/** The kernel package's bare specifier. */
const KERNEL_PACKAGE_SPECIFIER = '@deneb-viz/powerbi-host';

export interface ImportEntry {
    /** Path of the importing file relative to `apps/deneb/src`, forward-slash separated. */
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
 * Counts how many directory levels above `src/` a relative specifier
 * written inside `fromFile` climbs. Returns 0 or less when the specifier
 * stays inside `src/`; 1 means it lands in the app root (`apps/deneb`),
 * 2 or more means it leaves the app. Returns `undefined` for a
 * non-relative (package) specifier.
 */
export function levelsAboveSrc(
    fromFile: string,
    specifier: string
): number | undefined {
    const normalizedSpecifier = specifier.replaceAll('\\', '/');
    if (!normalizedSpecifier.startsWith('.')) {
        return undefined;
    }
    const resolved = posix.normalize(
        posix.join(posix.dirname(fromFile), normalizedSpecifier)
    );
    return resolved.split('/').filter((segment) => segment === '..').length;
}

/** True for a specifier rooted at the filesystem (POSIX root or a drive letter). */
const isAbsoluteSpecifier = (specifier: string): boolean =>
    specifier.startsWith('/') ||
    specifier.startsWith('\\') ||
    /^[A-Za-z]:/.test(specifier);

/**
 * Pure detection function: given (file, specifiers) entries, reports
 * every kernel-access violation. Exported so fixtures can drive it
 * directly without a filesystem.
 */
export function findKernelAccessViolations(
    entries: readonly ImportEntry[]
): BoundaryViolation[] {
    const violations: BoundaryViolation[] = [];
    for (const { file, specifiers } of entries) {
        for (const specifier of specifiers) {
            if (specifier.startsWith(`${KERNEL_PACKAGE_SPECIFIER}/`)) {
                violations.push({
                    file,
                    specifier,
                    reason: 'imports a deep path under the kernel package; import the bare specifier instead'
                });
                continue;
            }
            if (isAbsoluteSpecifier(specifier)) {
                violations.push({
                    file,
                    specifier,
                    reason: 'absolute import path, reaching outside the app by file system location'
                });
                continue;
            }
            const levels = levelsAboveSrc(file, specifier);
            if (levels !== undefined && levels >= 2) {
                violations.push({
                    file,
                    specifier,
                    reason: 'relative import climbs out of the app root, reaching into another workspace'
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
 * bindings and no `from`), dynamic imports (`import('...')`, including a
 * template literal without substitutions), and CommonJS `require('...')`
 * (which also covers `import x = require('...')`). A scan that only
 * matched `from` would miss the other forms.
 */
export const importSpecifiers = (source: string): string[] => [
    ...[...source.matchAll(/from\s*['"]([^'"]+)['"]/g)].map(
        (match) => match[1]
    ),
    ...[...source.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm)].map(
        (match) => match[1]
    ),
    ...[...source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(
        (match) => match[1]
    ),
    ...[...source.matchAll(/import\(\s*`([^`]+)`\s*\)/g)].map(
        (match) => match[1]
    ),
    ...[...source.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)].map(
        (match) => match[1]
    )
];

/** Every TypeScript source file under apps/deneb/src, as import entries. */
const SRC_ROOT = join(APP_ROOT, 'src');
const realEntries: ImportEntry[] = walkFiles(SRC_ROOT)
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .map((file) => ({
        file: relative(SRC_ROOT, file).split(sep).join('/'),
        specifiers: importSpecifiers(readFileSync(file, 'utf8'))
    }))
    .filter(({ file }) => !file.startsWith('__test__/invariants/'));

describe('kernel access boundary', () => {
    it('scans a non-trivial number of source files (guards against a vacuous canary)', () => {
        expect(realEntries.length).toBeGreaterThan(20);
    });

    it('reaches the kernel package from at least one app source file', () => {
        const importers = realEntries.filter(({ specifiers }) =>
            specifiers.includes(KERNEL_PACKAGE_SPECIFIER)
        );
        expect(importers.length).toBeGreaterThan(0);
    });

    it('finds no boundary violation among the app source files', () => {
        const violations = findKernelAccessViolations(realEntries);

        if (violations.length > 0) {
            console.error(
                `Found ${violations.length} kernel-access violation(s):\n` +
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

    describe('findKernelAccessViolations (pure function)', () => {
        it('flags a deep path under the kernel package', () => {
            const violations = findKernelAccessViolations([
                {
                    file: 'app/x.ts',
                    specifiers: ['@deneb-viz/powerbi-host/lib/interactivity']
                }
            ]);
            expect(violations).toHaveLength(1);
            expect(violations[0]).toMatchObject({
                file: 'app/x.ts',
                specifier: '@deneb-viz/powerbi-host/lib/interactivity'
            });
        });

        it('passes the bare kernel package specifier', () => {
            const violations = findKernelAccessViolations([
                { file: 'app/x.ts', specifiers: ['@deneb-viz/powerbi-host'] }
            ]);
            expect(violations).toEqual([]);
        });

        it('flags a relative import that climbs out of the app root', () => {
            const violations = findKernelAccessViolations([
                {
                    file: 'app/x.ts',
                    specifiers: ['../../../packages/powerbi-host/src/lib']
                }
            ]);
            expect(violations).toHaveLength(1);
            expect(violations[0]).toMatchObject({
                file: 'app/x.ts',
                specifier: '../../../packages/powerbi-host/src/lib'
            });
        });

        it('flags an escape from the app root written by a file at src level', () => {
            const violations = findKernelAccessViolations([
                { file: 'index.ts', specifiers: ['../../packages/x'] }
            ]);
            expect(violations).toHaveLength(1);
        });

        it('passes relative imports that stay inside src', () => {
            const violations = findKernelAccessViolations([
                {
                    file: 'features/settings/x.tsx',
                    specifiers: ['./y', '../helpers', '../../lib/application']
                }
            ]);
            expect(violations).toEqual([]);
        });

        it('passes relative imports that land in the app root beside src', () => {
            const violations = findKernelAccessViolations([
                { file: 'index.ts', specifiers: ['../style/visual.less'] },
                { file: 'app/kernel-config.ts', specifiers: ['../../config'] }
            ]);
            expect(violations).toEqual([]);
        });

        it('passes package (non-relative) specifiers', () => {
            const violations = findKernelAccessViolations([
                {
                    file: 'features/settings/x.tsx',
                    specifiers: ['@deneb-viz/app-core', 'react']
                }
            ]);
            expect(violations).toEqual([]);
        });

        it('flags a bare (side-effect) import that climbs out of the app root', () => {
            const violations = findKernelAccessViolations([
                {
                    file: 'app/x.ts',
                    specifiers: importSpecifiers(
                        "import '../../../packages/powerbi-host/src/index';\n"
                    )
                }
            ]);
            expect(violations).toHaveLength(1);
        });

        it('flags a deep-path dynamic import', () => {
            const violations = findKernelAccessViolations([
                {
                    file: 'app/x.ts',
                    specifiers: importSpecifiers(
                        "const mod = await import('@deneb-viz/powerbi-host/state');\n"
                    )
                }
            ]);
            expect(violations).toHaveLength(1);
            expect(violations[0]).toMatchObject({
                specifier: '@deneb-viz/powerbi-host/state'
            });
        });

        it('flags a template-literal dynamic import that climbs out of the app root', () => {
            const violations = findKernelAccessViolations([
                {
                    file: 'app/x.ts',
                    specifiers: importSpecifiers(
                        'const mod = await import(`../../../packages/powerbi-host/src/index`);\n'
                    )
                }
            ]);
            expect(violations).toHaveLength(1);
        });

        it('flags require calls and import-equals-require that climb out of the app root', () => {
            const violations = findKernelAccessViolations([
                {
                    file: 'app/x.ts',
                    specifiers: importSpecifiers(
                        "const a = require('../../../packages/a');\n" +
                            'const b = require("../../../packages/b");\n' +
                            "import c = require('../../../packages/c');\n"
                    )
                }
            ]);
            expect(violations).toHaveLength(3);
        });

        it('flags an absolute import path', () => {
            const violations = findKernelAccessViolations([
                {
                    file: 'app/x.ts',
                    specifiers: [
                        '/repo/packages/powerbi-host/src/index',
                        'C:/repo/packages/powerbi-host/src/index'
                    ]
                }
            ]);
            expect(violations).toHaveLength(2);
            expect(violations[0].reason).toContain('absolute');
        });

        it('flags a backslash-separated relative specifier that climbs out of the app root', () => {
            const violations = findKernelAccessViolations([
                {
                    file: 'app/x.ts',
                    specifiers: ['..\\..\\..\\packages\\powerbi-host']
                }
            ]);
            expect(violations).toHaveLength(1);
        });
    });
});
