import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compileSpec } from '@deneb-viz/vega-runtime/compilation';

/**
 * Characterizes the compilation slice's behaviour around
 * `state.interface.renderId` and runtime-error recording.
 *
 * Post-cleanup contract (P3, JFR-003 + REL-003):
 * - `handleCompile` does NOT bump `state.interface.renderId`. The
 *   listener-rebind contract is owned by `vega-embed.tsx#handleEmbed`'s
 *   post-embed `generateRenderId()` call, which fires AFTER the new
 *   `View` instance is attached. Bumping at compile time was both racy
 *   (effect fired before the view existed) and noisy (every debounced
 *   keystroke compile cycled the listener even though the same view was
 *   reused).
 * - `handleLogError` does NOT bump `renderId` either. Runtime errors
 *   arrive on the existing view; they do not signal view replacement.
 *   The dedup guard against repeat messages still applies (Vega can pulse
 *   the same error every tick).
 * - `state.debug.logAttention` was deleted in P3 — these tests no longer
 *   assert against it.
 *
 * Notes:
 * - We do not spin up the full `StoreState`. The slice handlers that do
 *   the work are pure state-shape transformers, so we exercise them
 *   directly by constructing a minimal `StoreState`-shaped input and
 *   asserting the returned `Partial<StoreState>` shape.
 * - `compileSpec` is mocked because we only care about the post-compile
 *   state merge behaviour — actual compilation result handling is covered
 *   by tests in `@deneb-viz/vega-runtime`.
 */

vi.mock('@deneb-viz/vega-runtime/compilation', () => ({
    compileSpec: vi.fn(() => ({
        errors: [],
        warnings: [],
        embedOptions: {},
        spec: {}
    }))
}));

import { createCompilationSlice } from '../compilation';

// Minimal fixture matching the slice's StoreState dependencies.
const makeStateFixture = (overrides: Partial<Record<string, unknown>> = {}) =>
    ({
        compilation: {
            result: null,
            isCompiling: false,
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
        debug: {
            datasetName: '',
            dataPivotSort: { source: null, data: null },
            dataPivotPage: { source: 1, data: 1 }
        },
        interface: {
            renderId: 'initial-render-id'
        },
        // `handleCompile` re-evaluates compilation-gated commands on every
        // compile via the helpers in `lib/commands/state.ts`, reading these
        // three fields. Fixture provides safe defaults; tests in this file
        // don't assert on commands but the code path needs the inputs.
        editorZoomLevel: 100,
        editor: { isDirty: false },
        commands: {},
        ...overrides
    }) as never;

/**
 * Build a live slice bound to a mutable state cell, then let tests invoke
 * the action directly. `set` receives the updater and merges the returned
 * partial into the state cell.
 */
const makeSliceHarness = () => {
    let state = makeStateFixture();
    const setSpy = vi.fn((updater: (s: never) => Partial<never>) => {
        const partial = updater(state);
        state = { ...state, ...partial } as never;
    });
    const slice = createCompilationSlice()(
        setSpy as never,
        (() => state) as never,
        {} as never
    );
    // The slice factory resolves the `set` closure against the actions we
    // call through `slice.compilation.*`, so we need to stitch the actions
    // onto the state cell as well — the handlers read `state.compilation`
    // when computing their partial.
    state = { ...state, ...slice } as never;
    return {
        getState: () => state,
        actions: slice.compilation
    };
};

describe('compilation slice — renderId is owned by the embed lifecycle, not by compile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does NOT bump interface.renderId on a successful compile (view replacement is signalled by vega-embed)', () => {
        const harness = makeSliceHarness();
        const before = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        harness.actions.compile({} as never);
        const after = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        expect(after).toBe(before);
    });

    it('does NOT bump interface.renderId when compile returns errors', () => {
        // Override the default success mock for this test only — exercise
        // the error branch in `handleCompile`. Even on errors, the slice
        // does not bump renderId; the embed lifecycle owns that.
        vi.mocked(compileSpec).mockReturnValueOnce({
            errors: ['boom'],
            warnings: [],
            embedOptions: {},
            spec: {}
        } as never);
        const harness = makeSliceHarness();
        const before = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        harness.actions.compile({} as never);
        const after = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        expect(after).toBe(before);
    });

    it('does NOT bump interface.renderId when logError records a new error', () => {
        const harness = makeSliceHarness();
        const before = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        harness.actions.logError('boom');
        const after = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        expect(after).toBe(before);
    });

    it('does NOT bump interface.renderId on a duplicate logError (dedup preserved)', () => {
        const harness = makeSliceHarness();
        harness.actions.logError('vega: invalid expression');
        const afterFirst = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        harness.actions.logError('vega: invalid expression');
        const afterDuplicate = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        expect(afterDuplicate).toBe(afterFirst);
    });

    it('preserves other compilation fields when handling compile', () => {
        const harness = makeSliceHarness();
        harness.actions.compile({} as never);
        const next = harness.getState() as {
            compilation: { isCompiling: boolean; lastCompiled: number | null };
        };
        expect(next.compilation.isCompiling).toBe(false);
        expect(typeof next.compilation.lastCompiled).toBe('number');
    });

    it('appends a new error message to runtimeErrors', () => {
        const harness = makeSliceHarness();
        harness.actions.logError('first');
        const next = harness.getState() as {
            compilation: { runtimeErrors: string[] };
        };
        expect(next.compilation.runtimeErrors).toEqual(['first']);
    });

    it('does NOT append a duplicate error message to runtimeErrors', () => {
        const harness = makeSliceHarness();
        harness.actions.logError('boom');
        harness.actions.logError('boom');
        const next = harness.getState() as {
            compilation: { runtimeErrors: string[] };
        };
        expect(next.compilation.runtimeErrors).toEqual(['boom']);
    });

    it('appends distinct error messages in order', () => {
        const harness = makeSliceHarness();
        harness.actions.logError('first');
        harness.actions.logError('first'); // duplicate, suppressed
        harness.actions.logError('second');
        const next = harness.getState() as {
            compilation: { runtimeErrors: string[] };
        };
        expect(next.compilation.runtimeErrors).toEqual(['first', 'second']);
    });
});
