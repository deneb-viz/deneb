// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { PACKAGES_DIR } from './_packages';

/**
 * Canary: the dependency between the two app packages is strictly one-way.
 *
 * `@deneb-viz/editor` builds on `@deneb-viz/app-core`; app-core must never
 * depend on, or import from, the editor package, or the viewer core would
 * drag Monaco and the editor UI back into every consumer. Two checks, both
 * over data read off disk: app-core's manifest names the editor package in
 * no dependency map, and no app-core source file contains the editor
 * package specifier. A flat text scan rather than a reachability walk: any
 * mention at all is a violation, imported or not. Test files are excluded
 * because app-core's own canaries name the specifier in assertions.
 */
const EDITOR_PACKAGE = '@deneb-viz/editor';
const APP_CORE_DIR = join(PACKAGES_DIR, 'app-core');
const EDITOR_DIR = join(PACKAGES_DIR, 'editor');

const DEPENDENCY_MAPS = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies'
] as const;

type Manifest = Partial<
    Record<(typeof DEPENDENCY_MAPS)[number], Record<string, string>>
>;

export interface DirectionViolation {
    /** Whether the violation is a manifest dependency map or a source file. */
    kind: 'manifest' | 'source';
    /** The offending dependency map name or package-relative file path. */
    location: string;
}

/**
 * Pure violation-detection function, factored out of the test body so it
 * can be exercised against in-memory input without writing a fixture.
 */
export const findEditorDependencyViolations = (
    manifest: Manifest,
    sources: ReadonlyMap<string, string>
): DirectionViolation[] => {
    const violations: DirectionViolation[] = [];
    for (const map of DEPENDENCY_MAPS) {
        if (manifest[map] && EDITOR_PACKAGE in manifest[map]) {
            violations.push({ kind: 'manifest', location: map });
        }
    }
    for (const [file, text] of sources) {
        if (text.includes(EDITOR_PACKAGE)) {
            violations.push({ kind: 'source', location: file });
        }
    }
    return violations;
};

const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });

const isTestFile = (file: string): boolean =>
    /__tests__|__bench__|\.test\.|\.bench\./.test(file);

const readManifest = (dir: string): Manifest =>
    JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Manifest;

const appCoreSources = new Map(
    walk(join(APP_CORE_DIR, 'src'))
        .filter((file) => /\.(ts|tsx)$/.test(file) && !isTestFile(file))
        .map((file) => [
            relative(APP_CORE_DIR, file).split(sep).join('/'),
            readFileSync(file, 'utf8')
        ])
);

describe('package dependency direction', () => {
    it('reads a non-trivial app-core source set (guards against a vacuous canary)', () => {
        expect(appCoreSources.size).toBeGreaterThan(20);
    });

    it('app-core neither depends on nor imports @deneb-viz/editor', () => {
        expect(
            findEditorDependencyViolations(
                readManifest(APP_CORE_DIR),
                appCoreSources
            )
        ).toEqual([]);
    });

    it('the editor package declares app-core as a peer (the permitted direction)', () => {
        expect(
            readManifest(EDITOR_DIR).peerDependencies?.['@deneb-viz/app-core']
        ).toBeDefined();
    });

    describe('findEditorDependencyViolations (pure function)', () => {
        it('reports a manifest listing the editor package under any dependency map', () => {
            expect(
                findEditorDependencyViolations(
                    { dependencies: { [EDITOR_PACKAGE]: '*' } },
                    new Map()
                )
            ).toEqual([{ kind: 'manifest', location: 'dependencies' }]);
            expect(
                findEditorDependencyViolations(
                    { peerDependencies: { [EDITOR_PACKAGE]: '*' } },
                    new Map()
                )
            ).toEqual([{ kind: 'manifest', location: 'peerDependencies' }]);
        });

        it('reports a source file containing the editor package specifier', () => {
            expect(
                findEditorDependencyViolations(
                    {},
                    new Map([
                        ['src/index.ts', "export * from './app';"],
                        [
                            'src/app/viewer.tsx',
                            "import { DenebEditor } from '@deneb-viz/editor';"
                        ]
                    ])
                )
            ).toEqual([{ kind: 'source', location: 'src/app/viewer.tsx' }]);
        });

        it('reports nothing for a clean manifest and sources', () => {
            expect(
                findEditorDependencyViolations(
                    { dependencies: { '@deneb-viz/utils': '*' } },
                    new Map([['src/index.ts', "export * from './app';"]])
                )
            ).toEqual([]);
        });
    });
});
