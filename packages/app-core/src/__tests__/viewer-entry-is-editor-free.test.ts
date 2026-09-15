import { describe, it, expect } from 'vitest';
import { entryFile, walkReachability } from './_reachability-walk';

/**
 * Canary test: proves the root barrel (`src/index.ts`) -- the
 * viewer's public entry point -- reaches no editor-only code by value.
 *
 * Complements `architecture-boundaries.test.ts` (which enforces the
 * layer dependency matrix everywhere in `src/`) by asserting a stronger,
 * entry-specific property: NOTHING under the editor-only feature/lib/
 * state/app paths, and no value import of `monaco-editor`, is reachable
 * starting from `src/index.ts`. The boundaries lint would happily allow
 * `index.ts` (an `entry`-layer file) to import an editor feature --
 * entry is permitted to import from every layer. This canary is what
 * actually keeps editor-only code from creeping into the root barrel's
 * reachable graph.
 */

/**
 * Path fragments identifying editor-only source. A reached file whose
 * (forward-slash, src/-relative) path matches any of these is a
 * violation. Kept as a flat list of independent regexes -- rather than
 * one combined alternation -- so a failing assertion can report which
 * specific area leaked.
 */
const EDITOR_ONLY_FILE_PATTERNS: RegExp[] = [
    /context\/specification-editor/,
    /lib\/commands/,
    /lib\/monaco/,
    /lib\/editor\//,
    /lib\/schema/,
    /lib\/field-processing/,
    /lib\/perf/,
    /lib\/clipboard/,
    /features\/(command-bar|compiled-vega|debug-area|project-export|settings-pane|specification-editor)/,
    /app\/editor\//,
    /app\/deneb-editor/,
    /app\/retained-deneb-editor/,
    /catalog\//,
    /state\/(editor|export|commands|debug|settings-pane|field-usage|install-editor-state|editor-state-access)\.ts/
];

/**
 * External specifiers that pull editor code into the reached graph: Monaco
 * itself, or the editor package (which depends on this package, never the
 * reverse).
 */
const EDITOR_ONLY_EXTERNAL_PATTERN =
    /^monaco-editor|^@monaco-editor\/|^@deneb-viz\/editor(\/|$)/;

export interface EditorOnlyReachViolation {
    /** Whether the violation is a reached source file or an external specifier. */
    kind: 'file' | 'external';
    /** The offending file path (src/-relative) or module specifier. */
    value: string;
    /** The pattern (as a string) that matched. */
    matchedPattern: string;
}

/**
 * Pure violation-detection function, factored out of the test body so it
 * can be exercised directly against synthetic input (see the "reports a
 * synthetic violation" test below) without writing a fixture directory.
 */
export function findEditorOnlyReach(
    files: readonly string[],
    externals: readonly string[]
): EditorOnlyReachViolation[] {
    const violations: EditorOnlyReachViolation[] = [];

    for (const file of files) {
        for (const pattern of EDITOR_ONLY_FILE_PATTERNS) {
            if (pattern.test(file)) {
                violations.push({
                    kind: 'file',
                    value: file,
                    matchedPattern: pattern.toString()
                });
                break;
            }
        }
    }

    for (const specifier of externals) {
        if (EDITOR_ONLY_EXTERNAL_PATTERN.test(specifier)) {
            violations.push({
                kind: 'external',
                value: specifier,
                matchedPattern: EDITOR_ONLY_EXTERNAL_PATTERN.toString()
            });
        }
    }

    return violations;
}

/**
 * Non-vacuous guard: a canary that silently reaches zero files (e.g.
 * because the walker's resolution silently broke) would pass every
 * assertion below for the wrong reason. Every glob/reachability-driven
 * canary in this repo carries this guard -- see
 * `apps/deneb/src/__test__/invariants/package-lint-coverage.test.ts`
 * ("finds code packages (guards against a vacuous canary)").
 */
const MINIMUM_EXPECTED_REACHED_FILES = 20;

describe('viewer entry is editor-free', () => {
    const { files, externals } = walkReachability([entryFile('index.ts')]);

    it('reaches a non-trivial number of files (guards against a vacuous canary)', () => {
        expect(files.length).toBeGreaterThanOrEqual(
            MINIMUM_EXPECTED_REACHED_FILES
        );
    });

    it('reaches no editor-only file and no value import of monaco-editor or the editor package', () => {
        const violations = findEditorOnlyReach(files, externals);

        if (violations.length > 0) {
            console.error(
                `Found ${violations.length} editor-only reach violation(s) from src/index.ts:\n` +
                    violations
                        .map(
                            (v) =>
                                `  [${v.kind}] ${v.value}  (matched ${v.matchedPattern})`
                        )
                        .join('\n')
            );
        }

        expect(violations).toEqual([]);
    });

    describe('findEditorOnlyReach (pure function)', () => {
        it('reports a synthetic reachable file under an editor-only path', () => {
            const violations = findEditorOnlyReach(
                [
                    'app/index.ts',
                    'features/settings-pane/components/settings-pane.tsx',
                    'lib/interface/theme.ts'
                ],
                []
            );

            expect(violations).toHaveLength(1);
            expect(violations[0]).toMatchObject({
                kind: 'file',
                value: 'features/settings-pane/components/settings-pane.tsx'
            });
        });

        it('reports a synthetic external specifier matching monaco-editor or the editor package', () => {
            const violations = findEditorOnlyReach(
                [],
                [
                    'react',
                    'monaco-editor',
                    '@monaco-editor/react',
                    '@deneb-viz/editor'
                ]
            );

            expect(violations).toHaveLength(3);
            expect(violations.map((v) => v.value).sort()).toEqual(
                [
                    '@deneb-viz/editor',
                    '@monaco-editor/react',
                    'monaco-editor'
                ].sort()
            );
        });

        it('reports nothing for a viewer-safe file list', () => {
            expect(
                findEditorOnlyReach(
                    ['app/index.ts', 'lib/interface/theme.ts'],
                    ['react', 'zustand']
                )
            ).toEqual([]);
        });
    });

    describe('non-vacuous guard behaviour', () => {
        it('an empty reachable set fails the canary rather than passing vacuously', () => {
            expect(() => {
                expect([].length).toBeGreaterThanOrEqual(
                    MINIMUM_EXPECTED_REACHED_FILES
                );
            }).toThrow();
        });
    });
});
