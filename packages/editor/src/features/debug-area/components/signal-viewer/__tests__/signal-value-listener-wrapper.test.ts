import { describe, expect, it } from 'vitest';

/**
 * Characterizes the `Object.is` bail-out semantics behind the signal
 * listener's `setSignalValue` fix in `signal-value.tsx`.
 *
 * Bug (Important #12): the listener used to call `setSignalValue(() =>
 * value)` with the raw value Vega handed back. `useState` skips the
 * re-render when `Object.is(next, prev)` is true — correct for primitives,
 * but wrong when a Vega signal is backed by an object/array that Vega
 * mutates in place and re-emits under the SAME reference. `Object.is` then
 * reports "unchanged" even though the content changed, the state update is
 * dropped, and the inspected cell shows a stale value.
 *
 * Fix: wrap every emitted value in a fresh `{ value }` object before handing
 * it to `setSignalValue`. The wrapper is a new reference on every call, so
 * `Object.is` never bails, and the triggering re-render always fires
 * regardless of what Vega does with the underlying value's identity.
 *
 * Vitest runs in the `node` environment with no `@testing-library/react`
 * available in this workspace (see `signal-value-memo-deps.test.ts` for the
 * established precedent of characterising React internals as a pure model
 * rather than rendering).
 */

/** Pure model of `useState`'s bail-out: would a `setState(next)` following a
 * `setState(prev)` actually schedule a re-render? */
const wouldReRender = (prev: unknown, next: unknown): boolean =>
    !Object.is(prev, next);

describe('signal listener setSignalValue — Object.is bail-out characterization', () => {
    it('BUG (pre-fix shape): a mutated object re-emitted under the same reference does not trigger a re-render', () => {
        const shared: { a: number } = { a: 1 };
        const prev = shared;
        shared.a = 2; // Vega mutates the object in place...
        const next = shared; // ...and re-emits the SAME reference.
        expect(wouldReRender(prev, next)).toBe(false);
    });

    it('FIX: wrapping every emit in a fresh object triggers a re-render even for the same mutated reference', () => {
        const shared: { a: number } = { a: 1 };
        const prevWrapped = { value: shared };
        shared.a = 2;
        const nextWrapped = { value: shared }; // fresh wrapper per emit
        expect(wouldReRender(prevWrapped, nextWrapped)).toBe(true);
    });

    it('FIX still triggers a re-render for genuinely-changed primitive values', () => {
        const prevWrapped = { value: 1 };
        const nextWrapped = { value: 2 };
        expect(wouldReRender(prevWrapped, nextWrapped)).toBe(true);
    });

    it('FIX triggers a re-render even when the emitted primitive is unchanged (accepted trade-off — see @privateRemarks in signal-value.tsx)', () => {
        const prevWrapped = { value: 1 };
        const nextWrapped = { value: 1 };
        expect(wouldReRender(prevWrapped, nextWrapped)).toBe(true);
    });
});
