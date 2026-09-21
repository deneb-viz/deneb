import { describe, it, expect } from 'vitest';
import { entryFile, walkReachability } from './_reachability-walk';

/**
 * Canary test: proves the transitional host barrel (`src/host.ts`) --
 * the kernel's future package entry point -- reaches no editor or Monaco
 * code by value.
 *
 * `src/host.ts` is the only surface app-side code may use to reach
 * kernel-side code (see `host-barrel-boundary.test.ts`), and it is what
 * moves to become `packages/powerbi-host/src/index.ts`. If Monaco or
 * `@deneb-viz/editor` were reachable from it, the future package would
 * pull the editor into the viewer-only bundle it is meant to keep clear
 * of. Cloned from `packages/app-core/src/__tests__/viewer-entry-is-editor-free.test.ts`,
 * pointed at `host.ts` instead of the viewer's root barrel.
 */

/**
 * External specifiers that would pull editor code into the reached
 * graph: Monaco itself, or the editor package (which depends on the
 * kernel/app-core, never the reverse).
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
    const { files, externals } = walkReachability([entryFile('host.ts')]);

    it('reaches a non-trivial number of files (guards against a vacuous canary)', () => {
        expect(files.length).toBeGreaterThanOrEqual(
            MINIMUM_EXPECTED_REACHED_FILES
        );
    });

    it('reaches no value import of monaco-editor or the editor package', () => {
        const violations = findEditorOnlyReach(externals);

        if (violations.length > 0) {
            console.error(
                `Found ${violations.length} editor-only reach violation(s) from src/host.ts:\n` +
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
