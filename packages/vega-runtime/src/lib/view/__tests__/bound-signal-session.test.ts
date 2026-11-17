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

    /**
     * Bars whose values a control multiplies, so that a write can widen the
     * numbers on the y axis.
     */
    const compileScaledBars = (autosize: { type: string; contains?: string }) =>
        compile({
            width: 400,
            height: 300,
            autosize,
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
    const SCALED_SPEC = compileScaledBars({ type: 'fit', contains: 'padding' });
    const SCALED_BOUND_SIGNALS = getBoundSignals(SCALED_SPEC);
    const [MULT] = SCALED_BOUND_SIGNALS;

    // A chart 200px high, padding included, with a legend of twenty entries
    // that reaches well below the plot. A control lengthens the x-axis
    // labels, so the axis needs more room below the plot while the legend
    // still reaches further.
    const LEGEND_SPEC_HEIGHT = 200;
    const LEGEND_SPEC = compile({
        width: 300,
        height: LEGEND_SPEC_HEIGHT,
        autosize: { type: 'fit', contains: 'padding' },
        data: {
            values: 'ABCDEFGHIJKLMNOPQRST'
                .split('')
                .map((c, index) => ({ c, v: index + 1 }))
        },
        params: [
            {
                name: 'long',
                value: 0,
                bind: { input: 'select', options: [0, 1] }
            }
        ],
        transform: [
            {
                calculate: "long ? datum.c + '_xxxx' : datum.c",
                as: 'label'
            }
        ],
        mark: 'bar',
        encoding: {
            x: {
                field: 'label',
                type: 'nominal',
                axis: { labelAngle: -90 }
            },
            y: { field: 'v', type: 'quantitative' },
            color: { field: 'c', type: 'nominal' }
        }
    } as TopLevelSpec).spec;
    const LEGEND_BOUND_SIGNALS = getBoundSignals(LEGEND_SPEC);

    afterEach(() => {
        vi.restoreAllMocks();
    });

    type TestBounds = { x1: number; y1: number; x2: number; y2: number };

    /** A mark in the top-level group: an axis, legend, title or mark. */
    type TopLevelMark = { role: string; bounds: TestBounds; items: unknown[] };

    type TestScenegraph = {
        root: { bounds: TestBounds; items: { items: TopLevelMark[] }[] };
    };

    const getTopLevelMarks = (view: View): TopLevelMark[] =>
        (view.scenegraph() as unknown as TestScenegraph).root.items[0].items;

    /**
     * How far the drawn content reaches above the room the view has left for
     * it. Zero or less means nothing is cut off.
     */
    const getOverflowAbove = (view: View): number => {
        const highest = Math.min(
            0,
            ...getTopLevelMarks(view).map((mark) => mark.bounds.y1)
        );
        return Math.ceil(-highest) - view.origin()[1];
    };

    /**
     * How far the drawn content reaches left of the room the view has left
     * for it. Zero or less means nothing is cut off.
     */
    const getOverflowLeft = (view: View): number => {
        const leftmost = Math.min(
            0,
            ...getTopLevelMarks(view).map((mark) => mark.bounds.x1)
        );
        return Math.ceil(-leftmost) - view.origin()[0];
    };

    /**
     * How far the axes reach below the room a `fit` view of the given height,
     * padding included, has left for them. Zero or less means nothing is cut
     * off.
     */
    const getAxisOverflowBelow = (view: View, height: number): number => {
        const padding = view.padding() as { top: number; bottom: number };
        const roomBelow =
            height -
            padding.top -
            padding.bottom -
            view.origin()[1] -
            view.height();
        const lowest = Math.max(
            ...getTopLevelMarks(view)
                .filter((mark) => mark.role === 'axis')
                .map((mark) => mark.bounds.y2)
        );
        return Math.ceil(lowest - view.height()) - roomBelow;
    };

    /** The categories that the bar mark currently draws. */
    const getCategoriesShown = (view: View): string[] => {
        const [barMark] = FITTED_SPEC.marks as { from: { data: string } }[];
        return view
            .data(barMark.from.data)
            .map((row: { category: string }) => row.category)
            .sort();
    };

    const createViewOf = async (spec: Spec) => {
        const view = new View(parse(patchSpecForBindings(spec)), {
            renderer: 'none'
        });
        await view.runAsync();
        return view;
    };

    const createFittedView = () => createViewOf(FITTED_SPEC);

    /**
     * Count the runs in flight on a view, so that a test can wait until a
     * write's run and every layout pass that follows it have finished.
     */
    const trackRuns = (view: View) => {
        const runAsync = view.runAsync.bind(view) as (
            ...args: unknown[]
        ) => Promise<View>;
        let runsInFlight = 0;
        const runAsyncSpy = vi
            .spyOn(view, 'runAsync')
            .mockImplementation((...args: unknown[]) => {
                runsInFlight += 1;
                return runAsync(...args).finally(() => {
                    runsInFlight -= 1;
                });
            });
        return {
            runAsync: runAsyncSpy,
            waitUntilIdle: () => vi.waitFor(() => expect(runsInFlight).toBe(0))
        };
    };

    /**
     * Make the room the content needs grow every time it is measured through
     * `view.scenegraph()`, so that no layout pass can give it enough. Vega
     * lays the view out from its own scenegraph, which is left as it is.
     */
    const makeLayoutUnsettled = (view: View) => {
        const getScenegraph = view.scenegraph.bind(view);
        let reads = 0;
        vi.spyOn(view, 'scenegraph').mockImplementation(() => {
            reads += 1;
            const { root } = getScenegraph() as unknown as TestScenegraph;
            const [topLevelGroup] = root.items;
            const reach = { x1: -1000 - reads, y1: 0, x2: 0, y2: 0 };
            const growingMark: TopLevelMark = {
                role: 'mark',
                bounds: reach,
                items: []
            };
            const scenegraph: TestScenegraph = {
                root: {
                    bounds: { ...root.bounds, x1: reach.x1 },
                    items: [
                        {
                            ...topLevelGroup,
                            items: [...topLevelGroup.items, growingMark]
                        }
                    ]
                }
            };
            return scenegraph as unknown as ReturnType<View['scenegraph']>;
        });
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
        const { waitUntilIdle } = trackRuns(view);
        const resize = vi.spyOn(view, 'resize');
        const { session } = attach(view, {}, FITTED_BOUND_SIGNALS);
        session.write(PICK.name, 'C');
        await waitUntilIdle();
        expect(resize).not.toHaveBeenCalled();
        expect(view.height()).toBe(height);
        expect(view.origin()).toEqual(origin);
        view.finalize();
    });

    it('lays the view out again when a pass leaves the content needing more room than it gave', async () => {
        const view = await createFittedView();
        const { waitUntilIdle } = trackRuns(view);
        const { session } = attach(view, {}, FITTED_BOUND_SIGNALS);
        session.write(PICK.name, 'A');
        await vi.waitFor(() => expect(getCategoriesShown(view)).toEqual(['A']));
        await waitUntilIdle();
        session.write(PICK.name, 'C');
        await vi.waitFor(() => expect(getCategoriesShown(view)).toEqual(['C']));
        await waitUntilIdle();
        expect(getOverflowAbove(view)).toBeLessThanOrEqual(0);
        view.finalize();
    });

    it('keeps wide axis numbers inside the view', async () => {
        const view = await createViewOf(SCALED_SPEC);
        const [roomLeftBefore] = view.origin();
        const { waitUntilIdle } = trackRuns(view);
        const { session } = attach(view, {}, SCALED_BOUND_SIGNALS);
        session.write(MULT.name, 1000000);
        await vi.waitFor(() => expect(view.signal(MULT.name)).toBe(1000000));
        await waitUntilIdle();
        expect(view.origin()[0]).toBeGreaterThan(roomLeftBefore);
        expect(getOverflowLeft(view)).toBe(0);
        view.finalize();
    });

    it('gives the axes the room they need below the plot when a legend reaches further', async () => {
        const view = await createViewOf(LEGEND_SPEC);
        expect(getAxisOverflowBelow(view, LEGEND_SPEC_HEIGHT)).toBe(0);
        const { waitUntilIdle } = trackRuns(view);
        const { session } = attach(view, {}, LEGEND_BOUND_SIGNALS);
        session.write('long', 1);
        await vi.waitFor(() => expect(view.signal('long')).toBe(1));
        await waitUntilIdle();
        expect(getAxisOverflowBelow(view, LEGEND_SPEC_HEIGHT)).toBe(0);
        view.finalize();
    });

    it('gives up after three passes when a layout does not settle', async () => {
        const view = await createFittedView();
        const { waitUntilIdle } = trackRuns(view);
        const resize = vi.spyOn(view, 'resize');
        makeLayoutUnsettled(view);
        const { session } = attach(view, {}, FITTED_BOUND_SIGNALS);
        session.write(PICK.name, 'A');
        await vi.waitFor(() => expect(getCategoriesShown(view)).toEqual(['A']));
        await waitUntilIdle();
        expect(resize).toHaveBeenCalledTimes(3);
        view.finalize();
    });

    it('still writes the signal when the room needed cannot be measured, and starts no pass', async () => {
        const view = await createFittedView();
        const { waitUntilIdle } = trackRuns(view);
        const resize = vi.spyOn(view, 'resize');
        vi.spyOn(view, 'scenegraph').mockImplementationOnce(() => {
            throw new Error('unmeasurable');
        });
        const { session, onError } = attach(view, {}, FITTED_BOUND_SIGNALS);
        session.write(PICK.name, 'A');
        await vi.waitFor(() => expect(getCategoriesShown(view)).toEqual(['A']));
        await waitUntilIdle();
        expect(view.signal(PICK.name)).toBe('A');
        expect(resize).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
        view.finalize();
    });

    it('starts no pass for a view whose autosize is none', async () => {
        const spec = compileScaledBars({ type: 'none' });
        const view = await createViewOf(spec);
        const { waitUntilIdle } = trackRuns(view);
        const resize = vi.spyOn(view, 'resize');
        const { session } = attach(view, {}, getBoundSignals(spec));
        session.write(MULT.name, 1000000);
        await vi.waitFor(() => expect(view.signal(MULT.name)).toBe(1000000));
        await waitUntilIdle();
        expect(resize).not.toHaveBeenCalled();
        view.finalize();
    });

    it('starts no further pass once the session is disposed', async () => {
        const view = await createFittedView();
        const { waitUntilIdle } = trackRuns(view);
        makeLayoutUnsettled(view);
        const { session } = attach(view, {}, FITTED_BOUND_SIGNALS);
        const resizeView = view.resize.bind(view);
        const resize = vi.spyOn(view, 'resize').mockImplementation(() => {
            session.dispose();
            return resizeView();
        });
        session.write(PICK.name, 'A');
        await vi.waitFor(() => expect(getCategoriesShown(view)).toEqual(['A']));
        await waitUntilIdle();
        expect(resize).toHaveBeenCalledTimes(1);
        view.finalize();
    });

    it('fits the layout once for a burst of writes, after the last', async () => {
        const view = await createViewOf(SCALED_SPEC);
        const { waitUntilIdle } = trackRuns(view);
        const resize = vi.spyOn(view, 'resize');
        const { session } = attach(view, {}, SCALED_BOUND_SIGNALS);
        for (const value of [10, 100, 1000, 10000, 100000, 1000000]) {
            session.write(MULT.name, value);
        }
        await vi.waitFor(() => expect(view.signal(MULT.name)).toBe(1000000));
        await waitUntilIdle();
        expect(resize).toHaveBeenCalledTimes(1);
        expect(getOverflowLeft(view)).toBe(0);
        view.finalize();
    });

    it('fits the layout once for a held value and a control written together', async () => {
        const view = await createViewOf(SCALED_SPEC);
        const { waitUntilIdle } = trackRuns(view);
        const resize = vi.spyOn(view, 'resize');
        applyHeldBoundValues({
            view,
            boundSignals: SCALED_BOUND_SIGNALS,
            heldValues: { [MULT.name]: { key: MULT.key, value: 1000 } }
        });
        const { session } = attach(view, {}, SCALED_BOUND_SIGNALS);
        session.write(MULT.name, 1000000);
        await vi.waitFor(() => expect(view.signal(MULT.name)).toBe(1000000));
        await waitUntilIdle();
        expect(resize).toHaveBeenCalledTimes(1);
        expect(getOverflowLeft(view)).toBe(0);
        view.finalize();
    });

    it('starts no pass when a burst of writes ends where it began', async () => {
        const view = await createViewOf(SCALED_SPEC);
        const { waitUntilIdle } = trackRuns(view);
        const resize = vi.spyOn(view, 'resize');
        const { session } = attach(view, {}, SCALED_BOUND_SIGNALS);
        session.write(MULT.name, 1000000);
        session.write(MULT.name, 1);
        await waitUntilIdle();
        expect(view.signal(MULT.name)).toBe(1);
        expect(resize).not.toHaveBeenCalled();
        view.finalize();
    });

    it('fits the layout after a write that follows a failed run', async () => {
        const view = await createViewOf(SCALED_SPEC);
        const { runAsync, waitUntilIdle } = trackRuns(view);
        const resize = vi.spyOn(view, 'resize');
        const { session, onError } = attach(view, {}, SCALED_BOUND_SIGNALS);
        runAsync.mockRejectedValueOnce(new Error('failed'));
        session.write(MULT.name, 1000);
        await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
        session.write(MULT.name, 1000000);
        await vi.waitFor(() => expect(view.signal(MULT.name)).toBe(1000000));
        await waitUntilIdle();
        expect(resize).toHaveBeenCalled();
        expect(getOverflowLeft(view)).toBe(0);
        view.finalize();
    });
});
