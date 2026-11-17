import { describe, expect, it } from 'vitest';
import { parse, View, type Spec } from 'vega';

import { patchSpecForBindings } from '../patch-bindings';

const createSpec = () =>
    ({
        config: { background: 'white', events: { defaults: { allow: [] } } },
        signals: [
            { name: 'plain', value: 1 },
            { name: 'slider', value: 5, bind: { input: 'range' } },
            {
                name: 'chosen',
                init: "'a'",
                bind: { input: 'select', options: ['a', 'b'] }
            },
            { name: 'derived', update: 'slider * 2', bind: { input: 'range' } }
        ],
        marks: []
    }) as unknown as Spec;

type LooseSpec = {
    config: { background?: string; events: Record<string, unknown> };
    signals: Record<string, unknown>[];
};

const loose = (spec: Spec) => spec as unknown as LooseSpec;

const runView = async (spec: Spec) => {
    const view = new View(parse(spec), { renderer: 'none' });
    await view.runAsync();
    return view;
};

describe('patchSpecForBindings', () => {
    it('switches input bindings off and keeps the rest of the config', () => {
        const patched = loose(patchSpecForBindings(createSpec(), {}));
        expect(patched.config.events.bind).toBe('none');
        expect(patched.config.events.defaults).toEqual({ allow: [] });
        expect(patched.config.background).toBe('white');
    });

    it('adds the config when the spec has none', () => {
        const patched = loose(
            patchSpecForBindings({ marks: [] } as unknown as Spec, {})
        );
        expect(patched.config.events).toEqual({ bind: 'none' });
    });

    it('does not mutate the spec it is given', () => {
        const spec = createSpec();
        const before = structuredClone(spec);
        patchSpecForBindings(spec, { slider: 9, chosen: 'b' });
        expect(spec).toEqual(before);
    });

    it('seeds a signal with its held value', () => {
        const patched = loose(
            patchSpecForBindings(createSpec(), { slider: 9 })
        );
        expect(patched.signals[1]).toMatchObject({ name: 'slider', value: 9 });
    });

    it('replaces init with the held value', () => {
        const patched = loose(
            patchSpecForBindings(createSpec(), { chosen: 'b' })
        );
        expect(patched.signals[2]).toMatchObject({
            name: 'chosen',
            value: 'b'
        });
        expect(patched.signals[2]).not.toHaveProperty('init');
    });

    it('leaves a signal with an update expression alone', () => {
        const spec = createSpec();
        const patched = loose(patchSpecForBindings(spec, { derived: 99 }));
        expect(patched.signals[3]).toBe(loose(spec).signals[3]);
    });

    it('applies a held null, false or zero', () => {
        const spec = {
            signals: [
                { name: 'a', value: 1 },
                { name: 'b', value: true },
                { name: 'c', value: 'x' }
            ]
        } as unknown as Spec;
        const patched = loose(
            patchSpecForBindings(spec, { a: 0, b: false, c: null })
        );
        expect(patched.signals.map((signal) => signal.value)).toEqual([
            0,
            false,
            null
        ]);
    });

    it('keeps the identity of signals it does not seed', () => {
        const spec = createSpec();
        const patched = loose(patchSpecForBindings(spec, { slider: 9 }));
        expect(patched.signals[0]).toBe(loose(spec).signals[0]);
        expect(patched.signals[2]).toBe(loose(spec).signals[2]);
    });

    it('passes over signal entries that are not definitions', () => {
        const spec = { signals: [null, 'text'] } as unknown as Spec;
        const patched = loose(patchSpecForBindings(spec, { slider: 9 }));
        expect(patched.signals).toEqual([null, 'text']);
    });

    it('gives a new view the held values on its first run', async () => {
        const view = await runView(
            patchSpecForBindings(createSpec(), { slider: 9, chosen: 'b' })
        );
        expect(view.signal('slider')).toBe(9);
        expect(view.signal('chosen')).toBe('b');
        expect(view.signal('derived')).toBe(18);
        view.finalize();
    });
});
