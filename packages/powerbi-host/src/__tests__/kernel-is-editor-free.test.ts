import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import {
    collectValueEdgeSpecifiers,
    entryFile,
    walkReachability
} from './_reachability-walk';

/**
 * Canary test: proves the package entry (`src/index.ts`) reaches no editor
 * or Monaco code by value.
 *
 * `src/index.ts` is the only surface consumers use to reach the kernel. If
 * Monaco or `@deneb-viz/editor` were reachable from it, the kernel would
 * pull the editor into any viewer-only bundle built on it. Same walk as
 * app-core's viewer-entry canary, rooted at `index.ts`.
 */

/**
 * External specifiers that would pull editor code into the reached
 * graph: Monaco itself, or the editor package (which depends on the
 * kernel/app-core, never the reverse).
 */
const EDITOR_ONLY_EXTERNAL_PATTERN =
    /^monaco-editor|^@monaco-editor\/|^@deneb-viz\/editor(\/|$)/;

export interface EditorOnlyReachViolation {
    /**
     * `findEditorOnlyReach` only tests external module specifiers against
     * `EDITOR_ONLY_EXTERNAL_PATTERN` — it never inspects reached source
     * files — so this is always `'external'`.
     */
    kind: 'external';
    /** The offending module specifier. */
    value: string;
    /** The pattern (as a string) that matched. */
    matchedPattern: string;
}

/**
 * Pure violation-detection function, factored out of the test body so it
 * can be exercised directly against synthetic input (see the "reports a
 * synthetic violation" test below) without a filesystem.
 */
export function findEditorOnlyReach(
    externals: readonly string[]
): EditorOnlyReachViolation[] {
    const violations: EditorOnlyReachViolation[] = [];

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
 * `package-lint-coverage.test.ts` ("finds code packages (guards against
 * a vacuous canary)").
 */
const MINIMUM_EXPECTED_REACHED_FILES = 20;

describe('kernel is editor-free', () => {
    const { files, externals } = walkReachability([entryFile('index.ts')]);

    it('reaches a non-trivial number of files (guards against a vacuous canary)', () => {
        expect(files.length).toBeGreaterThanOrEqual(
            MINIMUM_EXPECTED_REACHED_FILES
        );
    });

    it('reaches no value import of monaco-editor or the editor package', () => {
        const violations = findEditorOnlyReach(externals);

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
        it('reports a synthetic external specifier matching monaco-editor or the editor package', () => {
            const violations = findEditorOnlyReach([
                'react',
                'monaco-editor',
                '@monaco-editor/react',
                '@deneb-viz/editor'
            ]);

            expect(violations).toHaveLength(3);
            expect(violations.map((v) => v.value).sort()).toEqual(
                [
                    '@deneb-viz/editor',
                    '@monaco-editor/react',
                    'monaco-editor'
                ].sort()
            );
        });

        it('reports nothing for a kernel-safe external list', () => {
            expect(findEditorOnlyReach(['react', 'zustand'])).toEqual([]);
        });
    });

    describe('collectValueEdgeSpecifiers (pure function)', () => {
        const collect = (source: string) =>
            collectValueEdgeSpecifiers(
                ts.createSourceFile(
                    'synthetic.ts',
                    source,
                    ts.ScriptTarget.Latest,
                    true,
                    ts.ScriptKind.TS
                )
            );

        it('collects a static value import', () => {
            expect(collect(`import { a } from 'x';`)).toEqual(['x']);
        });

        it('does not collect an `import type` declaration', () => {
            expect(collect(`import type { A } from 'x';`)).toEqual([]);
        });

        it('does not collect an import whose named specifiers are all type-only', () => {
            expect(collect(`import { type A } from 'x';`)).toEqual([]);
        });

        it('collects a dynamic import call', () => {
            expect(collect(`const m = import('x');`)).toEqual(['x']);
        });

        it('collects a require call', () => {
            expect(collect(`const m = require('x');`)).toEqual(['x']);
        });

        it('collects an awaited dynamic import nested inside a function body', () => {
            expect(
                collect(
                    `async function load() { if (true) { return await import('x'); } }`
                )
            ).toEqual(['x']);
        });

        it('collects a re-export with a module specifier', () => {
            expect(collect(`export { a } from 'x';`)).toEqual(['x']);
        });

        it('ignores dynamic imports and requires whose argument is not a string literal', () => {
            expect(collect(`import(name); require(name);`)).toEqual([]);
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
