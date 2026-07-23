import { describe, expect, it } from 'vitest';
import type { CompilationResult } from '@deneb-viz/vega-runtime/compilation';

import { createCompilationSlice } from '../compilation';

/**
 * Characterizes `compilation.refreshContainerDimensions` — the cheap
 * re-embed path for the container-signal-owner design revision
 * (docs/plans/2026-07-23-001-container-signal-consolidation-design.md,
 * Revision 2). Geometry changes rewrite the stored compilation result's
 * `denebContainer` init width/height instead of writing the live Vega
 * signal; the new `result` object identity is what drives `VegaEmbed`'s
 * spec memo to re-embed from the already-compiled template.
 *
 * Follows the harness pattern from compilation-render-id.test.ts: the
 * slice's `set` updater is exercised directly against a mutable state
 * cell, so we don't need to spin up the full `StoreState`/store.
 */

/**
 * Build a fake "ready" compilation result whose parsed spec carries a
 * `denebContainer` Vega signal entry. Cast to `CompilationResult` — the
 * fixture only populates the fields this action reads/preserves.
 */
const makeReadyResult = (
    dims: { width: number; height: number } = { width: 541, height: 352 }
): CompilationResult =>
    ({
        status: 'ready',
        parsed: {
            status: 'ready',
            spec: {
                signals: [
                    {
                        name: 'denebContainer',
                        value: {
                            width: dims.width,
                            height: dims.height,
                            scrollWidth: dims.width,
                            scrollHeight: dims.height,
                            scrollTop: 0,
                            scrollLeft: 0
                        }
                    }
                ]
            },
            config: {},
            errors: [],
            warnings: []
        },
        embedOptions: { mode: 'vega' }
    }) as unknown as CompilationResult;

// Minimal fixture matching the slice's StoreState dependencies for this
// action — it only reads/writes `state.compilation`.
const makeStateFixture = (overrides: Partial<Record<string, unknown>> = {}) =>
    ({
        compilation: {
            result: null,
            lastCompiled: null,
            viewReady: false,
            runtimeErrors: [],
            runtimeWarnings: [],
            durableWarnings: [],
            durableErrors: [],
            enableIncrementalDataUpdates: true,
            incrementalUpdateThreshold: 500,
            __hasHydrated__: false
        },
        ...overrides
    }) as never;

/**
 * Build a live slice bound to a mutable state cell, then let tests invoke
 * the action directly. `set` receives the updater and merges the returned
 * value into the state cell (a plain shallow merge, matching zustand's
 * real `set` semantics closely enough to observe reference stability).
 */
const makeSliceHarness = (
    initialState: ReturnType<typeof makeStateFixture>
) => {
    let state = initialState;
    const setSpy = (updater: (s: never) => Partial<never>) => {
        const partial = updater(state as never);
        state = { ...state, ...partial } as never;
    };
    const slice = createCompilationSlice()(
        setSpy as never,
        (() => state) as never,
        {} as never
    );
    // Merge in the slice's action functions WITHOUT clobbering the
    // fixture's data fields (`slice.compilation` also carries its own
    // module-level `initialState` defaults for result/viewReady/etc.,
    // which would otherwise stomp the custom fixture data below).
    state = {
        ...state,
        compilation: {
            ...(slice.compilation as never),
            ...(state as never as { compilation: unknown }).compilation
        }
    } as never;
    return {
        getState: () => state,
        actions: slice.compilation
    };
};

describe('compilation slice — refreshContainerDimensions (cheap re-embed path)', () => {
    it('is a no-op when there is no compilation result', () => {
        const harness = makeSliceHarness(
            makeStateFixture({
                compilation: { ...makeStateFixture().compilation, result: null }
            })
        );
        const before = harness.getState() as { compilation: unknown };
        const beforeCompilation = before.compilation;

        harness.actions.refreshContainerDimensions({ width: 800, height: 600 });

        const after = harness.getState() as {
            compilation: { result: unknown };
        };
        expect(after.compilation).toBe(beforeCompilation);
        expect(after.compilation.result).toBeNull();
    });

    it('is a no-op when the compilation result status is "error"', () => {
        const errorResult = {
            status: 'error',
            parsed: {
                status: 'error',
                spec: null,
                config: null,
                errors: ['boom'],
                warnings: []
            },
            embedOptions: { mode: 'vega' },
            errors: ['boom']
        } as unknown as CompilationResult;
        const harness = makeSliceHarness(
            makeStateFixture({
                compilation: {
                    ...makeStateFixture().compilation,
                    result: errorResult
                }
            })
        );
        const before = harness.getState() as { compilation: unknown };
        const beforeCompilation = before.compilation;

        harness.actions.refreshContainerDimensions({ width: 800, height: 600 });

        const after = harness.getState() as {
            compilation: { result: CompilationResult };
        };
        expect(after.compilation).toBe(beforeCompilation);
        expect(after.compilation.result).toBe(errorResult);
    });

    it('is a no-op (result reference unchanged) when the dims already match the init', () => {
        const readyResult = makeReadyResult({ width: 541, height: 352 });
        const harness = makeSliceHarness(
            makeStateFixture({
                compilation: {
                    ...makeStateFixture().compilation,
                    result: readyResult
                }
            })
        );

        harness.actions.refreshContainerDimensions({ width: 541, height: 352 });

        const after = harness.getState() as {
            compilation: { result: CompilationResult };
        };
        expect(after.compilation.result).toBe(readyResult);
    });

    it('rewrites the stored result with new dims, preserving untouched fields', () => {
        const readyResult = makeReadyResult({ width: 541, height: 352 });
        const harness = makeSliceHarness(
            makeStateFixture({
                compilation: {
                    ...makeStateFixture().compilation,
                    result: readyResult,
                    viewReady: true,
                    lastCompiled: 12345
                }
            })
        );

        harness.actions.refreshContainerDimensions({ width: 800, height: 600 });

        const after = harness.getState() as {
            compilation: {
                result: CompilationResult;
                viewReady: boolean;
                lastCompiled: number | null;
            };
        };

        // New object identity — this is what drives VegaEmbed's spec memo.
        expect(after.compilation.result).not.toBe(readyResult);

        // Rewritten dims land in the parsed spec's denebContainer signal.
        const spec = after.compilation.result.parsed.spec as {
            signals: Array<{
                name: string;
                value: { width: number; height: number };
            }>;
        };
        expect(spec.signals[0].value.width).toBe(800);
        expect(spec.signals[0].value.height).toBe(600);

        // Untouched fields preserved.
        expect(after.compilation.result.status).toBe('ready');
        expect(after.compilation.result.embedOptions).toBe(
            readyResult.embedOptions
        );

        // This action does not touch viewReady/lastCompiled.
        expect(after.compilation.viewReady).toBe(true);
        expect(after.compilation.lastCompiled).toBe(12345);
    });
});
