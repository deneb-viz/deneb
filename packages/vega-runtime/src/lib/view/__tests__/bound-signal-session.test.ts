import { afterEach, describe, expect, it, vi } from 'vitest';
import { loader, parse, View, type Spec } from 'vega';
import { compile, type TopLevelSpec } from 'vega-lite';

import {
    getBoundSignals,
    type BoundSignal,
    type HeldBoundValue,
    type HeldBoundValues
} from '../../spec-processing/bound-signals';
import { patchSpecForBindings } from '../../spec-processing/patch-bindings';
import {
    applyHeldBoundValues,
    attachBoundSignals
} from '../bound-signal-session';

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

const SPEC_WITH_DATA_LOAD = {
    signals: [
        { name: 'year', value: 1, bind: { input: 'range' } },
        { name: 'doubled', update: 'year * 2' }
    ],
    data: [
        {
            name: 'table',
            url: { signal: "'data-' + year + '.json'" },
            format: { type: 'json' }
        }
    ],
    marks: []
} as unknown as Spec;

const BOUND_SIGNALS_WITH_DATA_LOAD = getBoundSignals(SPEC_WITH_DATA_LOAD);
const [YEAR] = BOUND_SIGNALS_WITH_DATA_LOAD;

/**
 * A view that loads data whenever `year` changes, with loads that can be
 * held open so that a run pauses part-way through.
 */
const createViewWithHeldLoads = async () => {
    let isHoldingLoads = false;
    const heldLoads: Array<() => void> = [];
    const delayedLoader = loader();
    delayedLoader.load = () =>
        isHoldingLoads
            ? new Promise<string>((resolve) => {
                  heldLoads.push(() => resolve('[]'));
              })
            : Promise.resolve('[]');
    const view = new View(parse(SPEC_WITH_DATA_LOAD), {
        renderer: 'none',
        loader: delayedLoader
    });
    await view.runAsync();
    return {
        view,
        holdLoads: () => {
            isHoldingLoads = true;
        },
        waitForHeldLoad: () =>
            vi.waitFor(() => expect(heldLoads).toHaveLength(1)),
        releaseLoads: () => {
            isHoldingLoads = false;
            heldLoads.splice(0).forEach((release) => release());
        }
    };
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

    it('applies a write that arrives while a run is waiting for data', async () => {
        const { view, holdLoads, waitForHeldLoad, releaseLoads } =
            await createViewWithHeldLoads();
        const { session, values } = attach(
            view,
            {},
            BOUND_SIGNALS_WITH_DATA_LOAD
        );
        holdLoads();
        session.write('year', 5);
        await waitForHeldLoad();
        session.write('year', 6);
        releaseLoads();
        await view.runAsync();
        expect(view.signal('year')).toBe(6);
        expect(view.signal('doubled')).toBe(12);
        expect(values.year).toEqual({ key: YEAR.key, value: 6 });
    });

    it('reports a queued held value while a run is still in flight', async () => {
        const { view, holdLoads, waitForHeldLoad, releaseLoads } =
            await createViewWithHeldLoads();
        holdLoads();
        view.signal('year', 5);
        const runInFlight = view.runAsync();
        await waitForHeldLoad();
        const { values } = attach(
            view,
            { year: { key: YEAR.key, value: 9 } },
            BOUND_SIGNALS_WITH_DATA_LOAD
        );
        expect(values.year).toEqual({ key: YEAR.key, value: 9 });
        releaseLoads();
        await runInFlight;
        await view.runAsync();
        expect(view.signal('year')).toBe(9);
        expect(view.signal('doubled')).toBe(18);
    });

    it('starts no run when the held values already match the view', async () => {
        const view = await createView();
        const runAsync = vi.spyOn(view, 'runAsync');
        const { onValue } = attach(view, { a: { key: A.key, value: 1 } });
        expect(runAsync).not.toHaveBeenCalled();
        expect(onValue).toHaveBeenCalledTimes(BOUND_SIGNALS.length);
    });
});

describe('applyHeldBoundValues', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    const apply = (view: View, heldValues: HeldBoundValues) => {
        const onError = vi.fn();
        applyHeldBoundValues({
            view,
            boundSignals: BOUND_SIGNALS,
            heldValues,
            onError
        });
        return { onError };
    };

    it('writes a held value that differs from the view', async () => {
        const view = await createView();
        apply(view, { a: { key: A.key, value: 7 } });
        await view.runAsync();
        expect(view.signal('a')).toBe(7);
        expect(view.signal('c')).toBe(14);
    });

    it('writes a held null, false or zero', async () => {
        const view = await createView();
        apply(view, {
            a: { key: A.key, value: 0 },
            b: { key: B.key, value: null }
        });
        await view.runAsync();
        expect(view.signal('a')).toBe(0);
        expect(view.signal('b')).toBeNull();
    });

    it('does not write to a signal with an update expression', async () => {
        const view = await createView();
        apply(view, { c: { key: C.key, value: 99 } });
        await view.runAsync();
        expect(view.signal('c')).toBe(2);
    });

    it('ignores a held value captured under another definition', async () => {
        const view = await createView();
        apply(view, { a: { key: 'stale', value: 7 } });
        await view.runAsync();
        expect(view.signal('a')).toBe(1);
    });

    it('skips a bound signal the view does not have', async () => {
        const view = await createView();
        const ghost: BoundSignal = {
            name: 'ghost',
            bind: { input: 'range' },
            key: 'ghost'
        };
        const runAsync = vi.spyOn(view, 'runAsync');
        expect(() =>
            applyHeldBoundValues({
                view,
                boundSignals: [ghost],
                heldValues: { ghost: { key: 'ghost', value: 1 } }
            })
        ).not.toThrow();
        expect(runAsync).not.toHaveBeenCalled();
    });

    it('starts no run when nothing differs', async () => {
        const view = await createView();
        const runAsync = vi.spyOn(view, 'runAsync');
        apply(view, {});
        apply(view, { a: { key: A.key, value: 1 } });
        expect(runAsync).not.toHaveBeenCalled();
    });

    it('writes every differing value in one run', async () => {
        const view = await createView();
        const runAsync = vi.spyOn(view, 'runAsync');
        apply(view, {
            a: { key: A.key, value: 3 },
            b: { key: B.key, value: 'y' }
        });
        expect(runAsync).toHaveBeenCalledTimes(1);
        await view.runAsync();
        expect(view.signal('a')).toBe(3);
        expect(view.signal('b')).toBe('y');
    });

    it('reports a run that fails', async () => {
        const view = await createView();
        vi.spyOn(view, 'runAsync').mockRejectedValueOnce(new Error('failed'));
        const { onError } = apply(view, { a: { key: A.key, value: 7 } });
        await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    });

    describe('on a Vega-Lite selection bound to an input', () => {
        const SELECTION_SPEC = compile({
            data: {
                values: [{ o: 'Europe' }, { o: 'Japan' }, { o: 'USA' }]
            },
            params: [
                {
                    name: 'org',
                    value: [{ o: 'Japan' }],
                    select: { type: 'point', fields: ['o'] },
                    bind: {
                        input: 'select',
                        options: [null, 'Europe', 'Japan', 'USA']
                    }
                }
            ],
            transform: [{ filter: { param: 'org' } }],
            mark: 'text',
            encoding: { text: { field: 'o' } }
        } as TopLevelSpec).spec;
        const SELECTION_BOUND_SIGNALS = getBoundSignals(SELECTION_SPEC);
        const [ORG] = SELECTION_BOUND_SIGNALS;

        /** The rows in the dataset that the compiled mark draws from. */
        const getRowsShown = (view: View): string[] => {
            const [mark] = SELECTION_SPEC.marks as {
                from: { data: string };
            }[];
            return view
                .data(mark.from.data)
                .map((row: { o: string }) => row.o)
                .sort();
        };

        const createSelectionView = async () => {
            const view = new View(parse(patchSpecForBindings(SELECTION_SPEC)), {
                renderer: 'none'
            });
            await view.runAsync();
            return view;
        };

        it('starts from the selection the spec gives', async () => {
            const view = await createSelectionView();
            expect(ORG.name).toBe('org_o');
            expect(view.signal('org_o')).toBe('Japan');
            expect(getRowsShown(view)).toEqual(['Japan']);
            view.finalize();
        });

        it.each([
            ['a value', 'USA', ['USA']],
            ['null', null, ['Europe', 'Japan', 'USA']]
        ])(
            'shows the rows that a held %s selects',
            async (_kind, heldValue, rowsShown) => {
                const view = await createSelectionView();
                applyHeldBoundValues({
                    view,
                    boundSignals: SELECTION_BOUND_SIGNALS,
                    heldValues: { org_o: { key: ORG.key, value: heldValue } }
                });
                await view.runAsync();
                expect(view.signal('org_o')).toBe(heldValue);
                expect(getRowsShown(view)).toEqual(rowsShown);
                view.finalize();
            }
        );
    });
});

describe('layout after a write', () => {
    // A chart of fixed total size: everything drawn has to fit inside it. The
    // text label sits above its bar, so the shortest bar, shown alone, puts
    // its label above the plot.
    const FITTED_SPEC = compile({
        width: 400,
        height: 300,
        autosize: { type: 'fit', contains: 'padding' },
        data: {
            values: [
                { category: 'A', value: 28 },
                { category: 'B', value: 55 },
                { category: 'C', value: 43 },
                { category: 'D', value: 91 }
            ]
        },
        title: 'Fitted',
        transform: [{ filter: { param: 'pick' } }],
        encoding: {
            x: { field: 'category', type: 'nominal' },
            y: { field: 'value', type: 'quantitative' }
        },
        layer: [
            {
                params: [
                    {
                        name: 'pick',
                        select: { type: 'point', fields: ['category'] },
                        value: [{ category: 'C' }],
                        bind: {
                            input: 'select',
                            options: [null, 'A', 'B', 'C', 'D']
                        }
                    }
                ],
                mark: 'bar'
            },
            {
                mark: { type: 'text', dy: -6 },
                encoding: { text: { field: 'value', type: 'quantitative' } }
            }
        ]
    } as TopLevelSpec).spec;
    const FITTED_BOUND_SIGNALS = getBoundSignals(FITTED_SPEC);
    const [PICK] = FITTED_BOUND_SIGNALS;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    /**
     * How far the drawn content reaches above the room the view has left for
     * it. Zero or less means nothing is cut off.
     */
    const getOverflowAbove = (view: View): number => {
        const root = (
            view.scenegraph().root as unknown as {
                items: { items: { bounds: { y1: number } }[] }[];
            }
        ).items[0];
        const highest = Math.min(
            0,
            ...root.items.map((mark) => mark.bounds.y1)
        );
        return Math.ceil(-highest) - view.origin()[1];
    };

    /** The categories that the bar mark currently draws. */
    const getCategoriesShown = (view: View): string[] => {
        const [barMark] = FITTED_SPEC.marks as { from: { data: string } }[];
        return view
            .data(barMark.from.data)
            .map((row: { category: string }) => row.category)
            .sort();
    };

    const createFittedView = async () => {
        const view = new View(parse(patchSpecForBindings(FITTED_SPEC)), {
            renderer: 'none'
        });
        await view.runAsync();
        return view;
    };

    it('keeps the chart inside its view when a control changes what is drawn', async () => {
        const view = await createFittedView();
        expect(getOverflowAbove(view)).toBeLessThanOrEqual(0);
        const { session } = attach(view, {}, FITTED_BOUND_SIGNALS);
        session.write(PICK.name, 'A');
        await vi.waitFor(() => expect(getCategoriesShown(view)).toEqual(['A']));
        await vi.waitFor(() =>
            expect(getOverflowAbove(view)).toBeLessThanOrEqual(0)
        );
        view.finalize();
    });

    it('keeps the chart inside its view when a held value is applied to a new view', async () => {
        const view = await createFittedView();
        expect(getOverflowAbove(view)).toBeLessThanOrEqual(0);
        applyHeldBoundValues({
            view,
            boundSignals: FITTED_BOUND_SIGNALS,
            heldValues: { [PICK.name]: { key: PICK.key, value: 'A' } }
        });
        await vi.waitFor(() => expect(getCategoriesShown(view)).toEqual(['A']));
        await vi.waitFor(() =>
            expect(getOverflowAbove(view)).toBeLessThanOrEqual(0)
        );
        view.finalize();
    });

    it('leaves the layout alone when a write does not change what is drawn', async () => {
        const view = await createFittedView();
        const height = view.height();
        const origin = view.origin();
        const { session } = attach(view, {}, FITTED_BOUND_SIGNALS);
        session.write(PICK.name, 'C');
        await view.runAsync();
        await view.runAsync();
        expect(view.height()).toBe(height);
        expect(view.origin()).toEqual(origin);
        view.finalize();
    });

    it('keeps wide axis numbers inside the view', async () => {
        const spec = compile({
            width: 400,
            height: 300,
            autosize: { type: 'fit', contains: 'padding' },
            data: {
                values: [
                    { c: 'A', v: 2 },
                    { c: 'B', v: 5 },
                    { c: 'C', v: 3 }
                ]
            },
            params: [
                {
                    name: 'mult',
                    value: 1,
                    bind: { input: 'range', min: 1, max: 1000000, step: 1 }
                }
            ],
            transform: [{ calculate: 'datum.v * mult', as: 'scaled' }],
            mark: 'bar',
            encoding: {
                x: { field: 'c', type: 'nominal' },
                y: { field: 'scaled', type: 'quantitative' }
            }
        } as TopLevelSpec).spec;
        const view = new View(parse(patchSpecForBindings(spec)), {
            renderer: 'none'
        });
        await view.runAsync();
        const getBounds = () =>
            (
                view.scenegraph() as unknown as {
                    root: { bounds: { x1: number } };
                }
            ).root.bounds;
        const leftBefore = getBounds().x1;
        const { session } = attach(view, {}, getBoundSignals(spec));
        session.write('mult', 1000000);
        await vi.waitFor(() => {
            expect(view.signal('mult')).toBe(1000000);
            expect(getBounds().x1).not.toBe(leftBefore);
        });
        // Vega gives room in whole pixels, so the scenegraph's bounds can
        // reach up to a pixel past it.
        await vi.waitFor(() =>
            expect(
                Math.ceil(-getBounds().x1) - view.origin()[0]
            ).toBeLessThanOrEqual(1)
        );
        view.finalize();
    });

    it('gives up after a few passes when a layout does not settle', async () => {
        const view = await createFittedView();
        const resize = vi.spyOn(view, 'resize');
        const { session } = attach(view, {}, FITTED_BOUND_SIGNALS);
        session.write(PICK.name, 'A');
        await vi.waitFor(() => expect(getCategoriesShown(view)).toEqual(['A']));
        await vi.waitFor(() =>
            expect(getOverflowAbove(view)).toBeLessThanOrEqual(0)
        );
        expect(resize.mock.calls.length).toBeGreaterThanOrEqual(1);
        expect(resize.mock.calls.length).toBeLessThanOrEqual(3);
        view.finalize();
    });
});
