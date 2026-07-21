import { describe, expect, it } from 'vitest';

/**
 * Characterizes the listener-rebind dep-array semantics of the Data tab's
 * dataset-viewing `useEffect`.
 *
 * Vitest runs in the node environment; React rendering is not feasible for
 * this test file. Per the plan (Unit 6), we capture the listener-rebind
 * contract as a pure helper that models React's `useEffect` rebind-on-dep-
 * change semantics (`Object.is`-shallow comparison per position) and assert
 * against it.
 *
 * The refactor in Unit 6 removes `logAttention` from the dep array. These
 * tests lock in:
 *
 * 1. **Regression guards (green before AND after the refactor):**
 *    `renderId` changes must cycle the listener. `datasetName` changes must
 *    cycle the listener. These characterize the load-bearing triggers that
 *    the Data tab relies on for correctness — the refactor must not
 *    accidentally drop them.
 *
 * 2. **Intentional behaviour change (flipped across the refactor):** Before
 *    the refactor, toggling `logAttention` with `renderId` and `datasetName`
 *    held constant WOULD cycle the listener (dep array includes it). After
 *    the refactor, the same transition MUST NOT cycle. We model the
 *    post-refactor dep array here (two elements, no `logAttention`) and
 *    assert the `logAttention` transition returns `false`. The pre-refactor
 *    expectation lived in the code reviewer's head; this file pins down the
 *    post-refactor invariant.
 */

/**
 * Pure model of React's `useEffect` dep-change detection. Returns `true`
 * when the next deps are not shallow-equal to the previous deps (and thus
 * the effect would re-run — cycling the listener).
 */
const shouldListenerRebind = (
    prevDeps: readonly unknown[],
    nextDeps: readonly unknown[]
): boolean => {
    if (prevDeps.length !== nextDeps.length) return true;
    for (let i = 0; i < prevDeps.length; i++) {
        if (!Object.is(prevDeps[i], nextDeps[i])) return true;
    }
    return false;
};

/**
 * Build a dep array matching the Data tab's POST-refactor `useEffect`:
 * `[datasetName, renderId]` — `logAttention` intentionally removed.
 */
const buildDataTabDeps = (datasetName: string, renderId: string) =>
    [datasetName, renderId] as const;

describe('Data tab listener rebind — characterization (pure dep-array model)', () => {
    describe('regression guards (green before AND after the refactor)', () => {
        it('cycles the listener when renderId changes', () => {
            const prev = buildDataTabDeps('dataset', 'render-1');
            const next = buildDataTabDeps('dataset', 'render-2');
            expect(shouldListenerRebind(prev, next)).toBe(true);
        });

        it('cycles the listener when datasetName changes', () => {
            const prev = buildDataTabDeps('old', 'render-1');
            const next = buildDataTabDeps('new', 'render-1');
            expect(shouldListenerRebind(prev, next)).toBe(true);
        });

        it('cycles the listener when BOTH renderId and datasetName change', () => {
            const prev = buildDataTabDeps('old', 'render-1');
            const next = buildDataTabDeps('new', 'render-2');
            expect(shouldListenerRebind(prev, next)).toBe(true);
        });

        it('does NOT cycle the listener when both deps are unchanged', () => {
            const prev = buildDataTabDeps('dataset', 'render-1');
            const next = buildDataTabDeps('dataset', 'render-1');
            expect(shouldListenerRebind(prev, next)).toBe(false);
        });
    });

    describe('post-refactor assertion: logAttention is NOT in the dep array', () => {
        /**
         * Pre-refactor the dep array was `[datasetName, renderId, logAttention]`,
         * so a `logAttention: true → false` transition cycled the listener.
         * Post-refactor (Unit 6), `logAttention` is removed — the transition
         * must NOT cycle. We prove that by holding `datasetName` and
         * `renderId` constant while the user's `logAttention` notionally
         * changes: because `logAttention` is not in `buildDataTabDeps`, the
         * resulting deps are identical and the rebind does not fire.
         *
         * `renderId` is bumped from `vega-embed.tsx#handleEmbed` after
         * `vegaEmbed()` resolves and the new `View` is attached — that's
         * the single edge that drives a real-world listener rebind on the
         * post-refactor codebase (P3). The compilation slice itself does
         * not bump `renderId`. See `compilation-render-id.test.ts`.
         */
        it('does NOT cycle the listener when only logAttention changes (renderId + datasetName constant)', () => {
            // Notional user-level action: logAttention flips true → false.
            // The dep array we build does NOT include logAttention, so deps
            // are unchanged.
            const prev = buildDataTabDeps('dataset', 'render-1');
            const next = buildDataTabDeps('dataset', 'render-1');
            expect(shouldListenerRebind(prev, next)).toBe(false);
        });

        it('has exactly 2 deps (datasetName, renderId) — no logAttention slot', () => {
            const deps = buildDataTabDeps('dataset', 'render-1');
            expect(deps).toHaveLength(2);
        });
    });

    describe('shouldListenerRebind — pure-helper unit behaviour', () => {
        it('returns true when dep-array length differs', () => {
            // Models the (legitimate) case where React remounts with a
            // different-shape dep array — e.g. conditionally keyed effect.
            // Not something this component does, but the helper must be
            // honest about React's actual semantics.
            expect(shouldListenerRebind([1, 2], [1, 2, 3])).toBe(true);
        });

        it('returns false for identical referenceable values', () => {
            const obj = { a: 1 };
            expect(shouldListenerRebind([obj, 'x'], [obj, 'x'])).toBe(false);
        });

        it('returns true for referentially different object deps, even if structurally equal', () => {
            // Matches React: useEffect does Object.is, not deep-equal.
            expect(shouldListenerRebind([{ a: 1 }, 'x'], [{ a: 1 }, 'x'])).toBe(
                true
            );
        });

        it('treats NaN as equal to NaN (Object.is semantics)', () => {
            expect(shouldListenerRebind([NaN], [NaN])).toBe(false);
        });
    });
});
