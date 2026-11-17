import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, View, type Spec } from 'vega';
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

const attach = (
    view: View,
    heldValues: HeldBoundValues = {},
    boundSignals: BoundSignal[] = []
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

    it('fits the layout when a write during a pass returns the content to the room it needed before the burst', async () => {
        const view = await createFittedView();
        const { waitUntilIdle } = trackRuns(view);
        const { session } = attach(view, {}, FITTED_BOUND_SIGNALS);
        session.write(PICK.name, 'A');
        await vi.waitFor(() => expect(getCategoriesShown(view)).toEqual(['A']));
        await waitUntilIdle();
        expect(getOverflowAbove(view)).toBeLessThanOrEqual(0);
        const resizeView = view.resize.bind(view);
        let isWritingDuringPass = false;
        vi.spyOn(view, 'resize').mockImplementation(() => {
            if (!isWritingDuringPass) {
                isWritingDuringPass = true;
                queueMicrotask(() => session.write(PICK.name, 'A'));
            }
            return resizeView();
        });
        session.write(PICK.name, 'D');
        await vi.waitFor(() => expect(isWritingDuringPass).toBe(true));
        await vi.waitFor(() => expect(getCategoriesShown(view)).toEqual(['A']));
        await waitUntilIdle();
        expect(getOverflowAbove(view)).toBeLessThanOrEqual(0);
        view.finalize();
    });

    it('starts no pass when the top-level group is clipped, as it needs no room', async () => {
        const view = await createFittedView();
        const { waitUntilIdle } = trackRuns(view);
        const resize = vi.spyOn(view, 'resize');
        const getScenegraph = view.scenegraph.bind(view);
        vi.spyOn(view, 'scenegraph').mockImplementation(() => {
            const { root } = getScenegraph() as unknown as TestScenegraph;
            const [topLevelGroup] = root.items;
            const scenegraph: TestScenegraph = {
                root: { ...root, items: [{ ...topLevelGroup, clip: true }] }
            };
            return scenegraph as unknown as ReturnType<View['scenegraph']>;
        });
        const { session } = attach(view, {}, FITTED_BOUND_SIGNALS);
        session.write(PICK.name, 'A');
        await vi.waitFor(() => expect(getCategoriesShown(view)).toEqual(['A']));
        await waitUntilIdle();
        expect(resize).not.toHaveBeenCalled();
        view.finalize();
    });

    it('stops and reports the error when the room needed cannot be measured during a fit', async () => {
        const view = await createFittedView();
        const { waitUntilIdle } = trackRuns(view);
        const resize = vi.spyOn(view, 'resize');
        const getScenegraph = view.scenegraph.bind(view);
        const failure = new Error('unmeasurable after the run');
        let reads = 0;
        vi.spyOn(view, 'scenegraph').mockImplementation(() => {
            reads += 1;
            if (reads > 1) {
                throw failure;
            }
            return getScenegraph();
        });
        const { session, onError } = attach(view, {}, FITTED_BOUND_SIGNALS);
        session.write(PICK.name, 'A');
        await vi.waitFor(() => expect(getCategoriesShown(view)).toEqual(['A']));
        await waitUntilIdle();
        expect(view.signal(PICK.name)).toBe('A');
        expect(resize).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(failure);
        view.finalize();
    });
});
