import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, View, type Spec } from 'vega';

import {
    getBoundSignals,
    type BoundSignal,
    type HeldBoundValue,
    type HeldBoundValues
} from '../../spec-processing/bound-signals';
import { attachBoundSignals } from '../bound-signal-session';

const SPEC = {
    signals: [
        { name: 'a', value: 1, bind: { input: 'range' } },
        {
            name: 'b',
            value: 'x',
            bind: { input: 'select', options: ['x', 'y'] }
        },
        { name: 'c', update: 'a * 2', bind: { input: 'range' } },
        { name: 'd', value: 1, bind: { input: 'range', debounce: 50 } }
    ],
    marks: []
} as unknown as Spec;

const BOUND_SIGNALS = getBoundSignals(SPEC);
const [A, B, C, D] = BOUND_SIGNALS;

const createView = async () => {
    const view = new View(parse(SPEC), { renderer: 'none' });
    await view.runAsync();
    return view;
};

const attach = (
    view: View,
    heldValues: HeldBoundValues = {},
    boundSignals: BoundSignal[] = BOUND_SIGNALS
) => {
    const values: Record<string, HeldBoundValue> = {};
    const onValue = vi.fn((name: string, held: HeldBoundValue) => {
        values[name] = held;
    });
    const onError = vi.fn();
    const session = attachBoundSignals({
        view,
        boundSignals,
        heldValues,
        onValue,
        onError
    });
    return { session, values, onValue, onError };
};

describe('attachBoundSignals', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('records the current value of every bound signal when it attaches', async () => {
        const view = await createView();
        const { values } = attach(view);
        expect(values).toEqual({
            a: { key: A.key, value: 1 },
            b: { key: B.key, value: 'x' },
            c: { key: C.key, value: 2 },
            d: { key: D.key, value: 1 }
        });
    });

    it('applies a value that was held while no view was ready', async () => {
        const view = await createView();
        const { values } = attach(view, { a: { key: A.key, value: 7 } });
        expect(view.signal('a')).toBe(7);
        expect(values.a).toEqual({ key: A.key, value: 7 });
        await view.runAsync();
        expect(view.signal('c')).toBe(14);
        expect(values.c).toEqual({ key: C.key, value: 14 });
    });

    it('ignores a held value captured under another definition', async () => {
        const view = await createView();
        attach(view, { a: { key: 'stale', value: 7 } });
        expect(view.signal('a')).toBe(1);
    });

    it('does not write a held value to a signal with an update expression', async () => {
        const view = await createView();
        attach(view, { c: { key: C.key, value: 99 } });
        await view.runAsync();
        expect(view.signal('c')).toBe(2);
    });

    it('records a change made by something other than a control', async () => {
        const view = await createView();
        const { values } = attach(view);
        await view.signal('a', 5).runAsync();
        expect(values.a).toEqual({ key: A.key, value: 5 });
        expect(values.c).toEqual({ key: C.key, value: 10 });
    });

    it('writes a control value to the view', async () => {
        const view = await createView();
        const { session, values } = attach(view);
        session.write('b', 'y');
        await view.runAsync();
        expect(view.signal('b')).toBe('y');
        expect(values.b).toEqual({ key: B.key, value: 'y' });
    });

    it('delays a write by the binding debounce and applies only the last one', async () => {
        const view = await createView();
        const { session } = attach(view);
        vi.useFakeTimers();
        session.write('d', 3);
        session.write('d', 4);
        expect(view.signal('d')).toBe(1);
        vi.advanceTimersByTime(50);
        expect(view.signal('d')).toBe(4);
    });

    it('stops recording and writing once disposed', async () => {
        const view = await createView();
        const { session, onValue } = attach(view);
        onValue.mockClear();
        session.dispose();
        await view.signal('a', 9).runAsync();
        expect(onValue).not.toHaveBeenCalled();
        session.write('b', 'y');
        expect(view.signal('b')).toBe('x');
    });

    it('drops a debounced write that is still pending at disposal', async () => {
        const view = await createView();
        const { session } = attach(view);
        vi.useFakeTimers();
        session.write('d', 3);
        session.dispose();
        vi.advanceTimersByTime(50);
        expect(view.signal('d')).toBe(1);
    });

    it('skips a bound signal the view does not have', async () => {
        const view = await createView();
        const ghost: BoundSignal = {
            name: 'ghost',
            bind: { input: 'range' },
            key: 'ghost'
        };
        const { session, values } = attach(view, {}, [...BOUND_SIGNALS, ghost]);
        expect(values).not.toHaveProperty('ghost');
        expect(() => session.write('ghost', 1)).not.toThrow();
    });

    it('ignores a write for a name that is not bound', async () => {
        const view = await createView();
        const { session } = attach(view);
        expect(() => session.write('unbound', 1)).not.toThrow();
    });

    it('reports a run that fails after a write', async () => {
        const view = await createView();
        const { session, onError } = attach(view);
        vi.spyOn(view, 'runAsync').mockRejectedValueOnce(new Error('failed'));
        session.write('b', 'y');
        await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    });
});
