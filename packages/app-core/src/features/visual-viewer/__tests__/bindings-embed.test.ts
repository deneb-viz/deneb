import { describe, expect, it } from 'vitest';
import { parse, View, type Spec } from 'vega';

import { getDenebState } from '../../../state';
import {
    bindEmbeddedView,
    getViewBoundSignals,
    getViewFirstValue,
    patchCompiledSpecForBindings
} from '../bindings-embed';

const createSource = (sliderValue: number) =>
    ({
        $schema: 'https://vega.github.io/schema/vega/v6.json',
        signals: [
            { name: 'slider', value: sliderValue, bind: { input: 'range' } }
        ],
        marks: []
    }) as unknown as Spec;

type LooseSpec = {
    config: { events: { bind: string } };
    signals: { name: string; value: unknown }[];
};

/** Compile a spec into the store, and return its bound signals. */
const compile = (source: Spec) => {
    getDenebState().compilation.compile({
        spec: JSON.stringify(source),
        config: '{}',
        provider: 'vega',
        containerDimensions: { width: 400, height: 300 }
    });
    return getDenebState().compilation.result?.parsed.boundSignals ?? [];
};

const holdSliderValue = (key: string, value: unknown) =>
    getDenebState().bindings.setHeldValue('slider', { key, value });

const createView = async (spec: Spec) => {
    const view = new View(parse(spec), { renderer: 'none' });
    await view.runAsync();
    return view;
};

describe('patchCompiledSpecForBindings', () => {
    it("switches Vega's binding form off and does not seed a held value", () => {
        const [slider] = compile(createSource(5));
        holdSliderValue(slider.key, 9);
        const patched = patchCompiledSpecForBindings(
            createSource(5)
        ) as unknown as LooseSpec;
        expect(patched.config.events.bind).toBe('none');
        expect(patched.signals[0].value).toBe(5);
    });
});

describe('bindEmbeddedView', () => {
    it('gives a view the bound signals that were current when its spec was patched, not those of a later compile', async () => {
        const patchedBoundSignals = compile(createSource(5));
        const patched = patchCompiledSpecForBindings(createSource(5));
        const laterBoundSignals = compile(createSource(6));
        expect(laterBoundSignals[0].key).not.toBe(patchedBoundSignals[0].key);
        const view = await createView(patched);
        bindEmbeddedView(view, patched);
        expect(getViewBoundSignals(view)).toBe(patchedBoundSignals);
        view.finalize();
    });

    it('writes a held value to the view', async () => {
        const [slider] = compile(createSource(5));
        holdSliderValue(slider.key, 9);
        const patched = patchCompiledSpecForBindings(createSource(5));
        const view = await createView(patched);
        expect(view.signal('slider')).toBe(5);
        bindEmbeddedView(view, patched);
        await view.runAsync();
        expect(view.signal('slider')).toBe(9);
        view.finalize();
    });

    it('resets a signal whose definition has changed since its value was held', async () => {
        const [slider] = compile(createSource(5));
        holdSliderValue(slider.key, 9);
        compile(createSource(6));
        const patched = patchCompiledSpecForBindings(createSource(6));
        const view = await createView(patched);
        bindEmbeddedView(view, patched);
        await view.runAsync();
        expect(view.signal('slider')).toBe(6);
        view.finalize();
    });

    it('gives a view whose spec was never patched no bound signals', async () => {
        compile(createSource(5));
        const unpatched = createSource(5);
        const view = await createView(unpatched);
        bindEmbeddedView(view, unpatched);
        expect(getViewBoundSignals(view)).toEqual([]);
        bindEmbeddedView(view, undefined);
        expect(getViewBoundSignals(view)).toEqual([]);
        view.finalize();
    });
});

describe('getViewFirstValue', () => {
    it("returns a bound signal's value from when its view was bound, before a held value was written to it", async () => {
        const [slider] = compile(createSource(5));
        holdSliderValue(slider.key, 9);
        const patched = patchCompiledSpecForBindings(createSource(5));
        const view = await createView(patched);
        bindEmbeddedView(view, patched);
        await view.runAsync();
        expect(view.signal('slider')).toBe(9);
        expect(getViewFirstValue(view, slider)).toBe(5);
        view.finalize();
    });

    it('returns the value that an init expression gave the signal', async () => {
        const source = {
            $schema: 'https://vega.github.io/schema/vega/v6.json',
            signals: [
                { name: 'slider', init: '250', bind: { input: 'range' } }
            ],
            marks: []
        } as unknown as Spec;
        const [slider] = compile(source);
        const patched = patchCompiledSpecForBindings(source);
        const view = await createView(patched);
        bindEmbeddedView(view, patched);
        expect(getViewFirstValue(view, slider)).toBe(250);
        view.finalize();
    });

    it('returns nothing for a view that was never bound, or for a signal whose definition has changed since', async () => {
        const [slider] = compile(createSource(5));
        const patched = patchCompiledSpecForBindings(createSource(5));
        const view = await createView(patched);
        expect(getViewFirstValue(view, slider)).toBeUndefined();
        expect(getViewFirstValue(null, slider)).toBeUndefined();
        bindEmbeddedView(view, patched);
        const [redefined] = compile(createSource(6));
        expect(getViewFirstValue(view, redefined)).toBeUndefined();
        view.finalize();
    });
});

describe('getViewBoundSignals', () => {
    it('returns the same list every time for the same view', async () => {
        compile(createSource(5));
        const patched = patchCompiledSpecForBindings(createSource(5));
        const boundView = await createView(patched);
        bindEmbeddedView(boundView, patched);
        const unboundView = await createView(createSource(5));
        expect(getViewBoundSignals(boundView)).toBe(
            getViewBoundSignals(boundView)
        );
        expect(getViewBoundSignals(unboundView)).toEqual([]);
        expect(getViewBoundSignals(unboundView)).toBe(
            getViewBoundSignals(unboundView)
        );
        boundView.finalize();
        unboundView.finalize();
    });
});
