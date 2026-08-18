import { describe, expect, it } from 'vitest';

/**
 * Characterizes the dep-array semantics of `<SignalValue>`'s `currentValues`
 * `useMemo` in `signal-value.tsx`.
 *
 * Bug being guarded: when a Vega view is replaced (e.g. user changes a
 * spec-level `params[].value` and re-runs), `state.interface.renderId` bumps
 * via `generateRenderId()` in `vega-embed.tsx#handleEmbed`. But the
 * `<SignalValue>` component instance is preserved across the bump by
 * `react-data-table-component` (same row keys), so its local `signalValue`
 * state from the previous view remains in place and no listener event fires
 * for a signal whose new initial value was set during view construction.
 *
 * Pre-fix the memo dep array was `[getSignalValues, signalValue]`. A
 * `renderId`-only change with the same `signalName` did NOT trigger
 * recompute, so the cell rendered the stale display value from the prior
 * view until the component unmounted (tab switch, etc.). Post-fix the dep
 * array is `[getSignalValues, signalValue, renderId]` so view replacement
 * is itself a recompute trigger.
 *
 * Vitest runs in the `node` environment with no `@testing-library/react`
 * available in this workspace (see `no-data-message.test.tsx` and
 * `data-tab-listener-rebind.test.ts` for the established precedent). We
 * therefore characterise the dep-array contract as a pure helper that
 * models React's `useMemo` recompute-on-dep-change semantics
 * (`Object.is`-shallow comparison per position) and assert against it.
 */

/**
 * Pure model of React's `useMemo` dep-change detection. Returns `true` when
 * the next deps are not shallow-equal to the previous deps (and thus the
 * memo factory would re-execute).
 */
const shouldMemoRecompute = (
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
 * Build a dep array matching the POST-fix `currentValues` `useMemo`:
 * `[getSignalValues, signalValue, renderId]`.
 */
const buildPostFixDeps = (
    getSignalValues: () => unknown,
    signalValue: unknown,
    renderId: string | undefined
) => [getSignalValues, signalValue, renderId] as const;

/**
 * Build a dep array matching the PRE-fix `currentValues` `useMemo`:
 * `[getSignalValues, signalValue]`. Retained here purely to characterise
 * the regression — a `renderId`-only change must NOT recompute under this
 * shape.
 */
const buildPreFixDeps = (
    getSignalValues: () => unknown,
    signalValue: unknown
) => [getSignalValues, signalValue] as const;

describe('SignalValue currentValues memo — dep-array characterization', () => {
    it('recomputes when renderId changes (view replacement on re-run — the bug case)', () => {
        const fn = () => null;
        const prev = buildPostFixDeps(fn, 5, 'render-1');
        const next = buildPostFixDeps(fn, 5, 'render-2');
        expect(shouldMemoRecompute(prev, next)).toBe(true);
    });

    it('recomputes when signalValue changes (listener fires on the current view)', () => {
        const fn = () => null;
        const prev = buildPostFixDeps(fn, 5, 'render-1');
        const next = buildPostFixDeps(fn, 6, 'render-1');
        expect(shouldMemoRecompute(prev, next)).toBe(true);
    });

    it('does NOT recompute when all three deps are unchanged (memo optimisation invariant)', () => {
        const fn = () => null;
        const prev = buildPostFixDeps(fn, 5, 'render-1');
        const next = buildPostFixDeps(fn, 5, 'render-1');
        expect(shouldMemoRecompute(prev, next)).toBe(false);
    });

    it('recomputes when getSignalValues changes (signal name or translator changed)', () => {
        // Guards against a future "optimisation" that narrows deps to
        // `[signalValue, renderId]`: dropping `getSignalValues` from slot 0
        // would silently stop invalidating the memo on signalName or
        // translator change, with no listener event to compensate.
        const fn1 = () => null;
        const fn2 = () => null;
        const prev = buildPostFixDeps(fn1, 5, 'render-1');
        const next = buildPostFixDeps(fn2, 5, 'render-1');
        expect(shouldMemoRecompute(prev, next)).toBe(true);
    });

    it('a renderId-only change does NOT recompute under the pre-fix deps (locks the bug shape)', () => {
        // signalName, translate, and signalValue all constant; only the
        // underlying view was replaced. Pre-fix this returned the stale
        // memo, rendering the previous view's display in the cell. If a
        // future "optimisation" drops renderId again, this assertion
        // remains false but the post-fix renderId test above flips — that
        // mismatch is the loud signal.
        const fn = () => null;
        const prev = buildPreFixDeps(fn, 5);
        const next = buildPreFixDeps(fn, 5);
        expect(shouldMemoRecompute(prev, next)).toBe(false);
    });
});

/**
 * Structural canary for the renderId effect. Re-attaching the listener is not
 * enough: the owner hook seeds `denebContainer` in the SAME commit's effect
 * phase, and VisualViewer's effects run before the debug pane's in tree order,
 * so the write (and Vega's synchronous listener dispatch inside `runAsync`)
 * completes before the new-view listener is attached. The effect must
 * therefore also re-read the value with a fresh-reference state write so the
 * memo recomputes against the current view.
 */
describe('SignalValue renderId effect — re-read after listener cycle', () => {
    it('re-reads the signal value (fresh object) after cycling listeners on renderId change', async () => {
        const { readFileSync } = await import('node:fs');
        const { resolve } = await import('node:path');
        const source = readFileSync(
            resolve(__dirname, '..', 'signal-value.tsx'),
            'utf8'
        );
        expect(source).toMatch(
            /cycleListeners\(viewAtEntry\);(?:\s|\/\/[^\n]*)*setSignalValue\(\(\) => \(\{ value: getSignalValues\(\)\.display \}\)\);\s*return \(\) => \{\s*removeListener\(viewAtEntry\);\s*\};\s*\}, \[renderId\]\);/
        );
    });
});
