import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Characterizes the compilation slice's behaviour of bumping
 * `state.interface.renderId` on the two recovery paths that flip
 * `logAttention` (`handleCompile` at compilation.ts:~315 and `handleLogError`
 * at compilation.ts:~382).
 *
 * Unit 6 adds the `renderId` bump to those two paths BEFORE removing the
 * `logAttention` dep from the dataset viewer's listener `useEffect`. The
 * viewer's listener rebind used to be triggered implicitly by `logAttention`
 * flipping; after the refactor it relies on `renderId` changing. These
 * tests lock in that invariant.
 *
 * Notes:
 * - We do not spin up the full `StoreState`. The slice handlers that do the
 *   bumping are pure state-shape transformers, so we exercise them directly
 *   by constructing a minimal `StoreState`-shaped input and asserting the
 *   returned `Partial<StoreState>` contains the expected `interface.renderId`
 *   shape.
 * - `compileSpec` is mocked because we only care about the post-compile
 *   state merge behaviour — the actual compilation result is covered by
 *   tests in `@deneb-viz/vega-runtime`.
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
            logAttention: false,
            dataPivotSort: { source: null, data: null },
            dataPivotPage: { source: 1, data: 1 }
        },
        interface: {
            renderId: 'initial-render-id'
        },
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

describe('compilation slice — renderId bump on recovery paths', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('bumps interface.renderId when compile succeeds (recovery path ~line 315)', () => {
        const harness = makeSliceHarness();
        const before = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        harness.actions.compile({} as never);
        const after = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        expect(after).not.toBe(before);
        expect(typeof after).toBe('string');
        expect(after.length).toBeGreaterThan(0);
    });

    it('bumps interface.renderId when logError records a new error (~line 382)', () => {
        const harness = makeSliceHarness();
        const before = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        harness.actions.logError('boom');
        const after = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        expect(after).not.toBe(before);
    });

    it('emits a new renderId on each logError call (distinct each time)', () => {
        const harness = makeSliceHarness();
        harness.actions.logError('first');
        const afterFirst = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        harness.actions.logError('second');
        const afterSecond = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        expect(afterSecond).not.toBe(afterFirst);
    });

    it('preserves other compilation fields when bumping renderId on compile', () => {
        const harness = makeSliceHarness();
        harness.actions.compile({} as never);
        const next = harness.getState() as {
            compilation: { isCompiling: boolean; lastCompiled: number | null };
        };
        expect(next.compilation.isCompiling).toBe(false);
        expect(typeof next.compilation.lastCompiled).toBe('number');
    });

    it('keeps the logAttention flag behaviour intact after renderId bump (compile with no errors clears it)', () => {
        const harness = makeSliceHarness();
        harness.actions.compile({} as never);
        const next = harness.getState() as {
            debug: { logAttention: boolean };
        };
        expect(next.debug.logAttention).toBe(false);
    });

    it('keeps the logAttention flag behaviour intact after renderId bump (logError sets it true)', () => {
        const harness = makeSliceHarness();
        harness.actions.logError('fail');
        const next = harness.getState() as {
            debug: { logAttention: boolean };
        };
        expect(next.debug.logAttention).toBe(true);
    });

    it('bumps renderId for a NEW error message (deduplication guard miss)', () => {
        const harness = makeSliceHarness();
        const before = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        harness.actions.logError('vega: invalid expression');
        const after = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        expect(after).not.toBe(before);
    });

    it('does NOT bump renderId for a DUPLICATE error message (already in runtimeErrors)', () => {
        const harness = makeSliceHarness();
        // First call seeds the message and bumps renderId.
        harness.actions.logError('vega: invalid expression');
        const afterFirst = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        // Second call with the same message must NOT bump renderId — the
        // viewer listener should not rebind on a repeated pulse-level error.
        harness.actions.logError('vega: invalid expression');
        const afterDuplicate = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        expect(afterDuplicate).toBe(afterFirst);
    });

    it('still bumps renderId for a different error after a duplicate is suppressed', () => {
        const harness = makeSliceHarness();
        harness.actions.logError('first');
        harness.actions.logError('first'); // duplicate, suppressed
        const beforeDistinct = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        harness.actions.logError('second');
        const afterDistinct = (
            harness.getState() as { interface: { renderId: string } }
        ).interface.renderId;
        expect(afterDistinct).not.toBe(beforeDistinct);
    });
});
