import { describe, expect, it } from 'vitest';
import type { Spec } from 'vega';
import { compile, type TopLevelSpec } from 'vega-lite';

import {
    getBoundSignals,
    getHeldValue,
    getSeedValues,
    type BoundSignal,
    type HeldBoundValues
} from '../bound-signals';

const VEGA_SPEC = {
    signals: [
        { name: 'plain', value: 1 },
        { name: 'slider', value: 5, bind: { input: 'range', min: 0, max: 10 } },
        {
            name: 'chosen',
            init: "'a'",
            bind: { input: 'select', options: ['a', 'b'] }
        },
        { name: 'derived', update: 'slider * 2', bind: { input: 'range' } },
        { name: 'direct', bind: { element: '#external' } }
    ]
} as unknown as Spec;

const VEGA_LITE_DATA = {
    values: [
        { o: 'Europe', c: 4, y: 1 },
        { o: 'Japan', c: 6, y: 2 }
    ]
};

const compileVegaLite = (spec: unknown): Spec =>
    compile(spec as TopLevelSpec).spec;

const namesOf = (boundSignals: BoundSignal[]) =>
    boundSignals.map((boundSignal) => boundSignal.name);

describe('getBoundSignals', () => {
    it('returns the signals whose bind has an input, in spec order', () => {
        expect(namesOf(getBoundSignals(VEGA_SPEC))).toEqual([
            'slider',
            'chosen',
            'derived'
        ]);
    });

    it('records value, init and update as written', () => {
        const [slider, chosen, derived] = getBoundSignals(VEGA_SPEC);
        expect(slider).toMatchObject({
            value: 5,
            bind: { input: 'range', min: 0, max: 10 }
        });
        expect(slider).not.toHaveProperty('init');
        expect(slider).not.toHaveProperty('update');
        expect(chosen).toMatchObject({ init: "'a'" });
        expect(chosen).not.toHaveProperty('value');
        expect(derived).toMatchObject({ update: 'slider * 2' });
    });

    it('returns nothing for a spec without a signals array', () => {
        expect(getBoundSignals({} as Spec)).toEqual([]);
        expect(getBoundSignals({ signals: 'none' } as unknown as Spec)).toEqual(
            []
        );
    });

    it('skips entries that are not bound signal definitions', () => {
        const spec = {
            signals: [
                null,
                'text',
                { bind: { input: 'range' } },
                { name: 7, bind: { input: 'range' } },
                { name: 'legend', bind: 'legend' },
                { name: 'kept', bind: { input: 'checkbox' } }
            ]
        } as unknown as Spec;
        expect(namesOf(getBoundSignals(spec))).toEqual(['kept']);
    });

    it('gives equal definitions the same key and changed definitions a different key', () => {
        const withBind = (bind: object, value: unknown) =>
            getBoundSignals({
                signals: [{ name: 'slider', value, bind }]
            } as unknown as Spec)[0].key;
        const original = withBind({ input: 'range', max: 10 }, 5);
        expect(withBind({ input: 'range', max: 10 }, 5)).toBe(original);
        expect(withBind({ input: 'range', max: 20 }, 5)).not.toBe(original);
        expect(withBind({ input: 'range', max: 10 }, 6)).not.toBe(original);
    });

    describe('sanitising the binding', () => {
        const getBindings = (binds: object[]) =>
            getBoundSignals({
                signals: binds.map((bind) => ({ name: 'chosen', bind }))
            } as unknown as Spec);

        const getBinding = (bind: object) => getBindings([bind])[0].bind;

        const getKey = (bind: object) => getBindings([bind])[0].key;

        it.each([
            [
                'an object',
                {
                    style: {
                        backgroundImage: 'url(https://example.com/x)'
                    }
                }
            ],
            ['an array', ['Label']],
            ['a boolean', true]
        ])('drops a name that is %s', (_kind, name) => {
            expect(getBinding({ input: 'select', name })).not.toHaveProperty(
                'name'
            );
        });

        it('keeps a text name and converts a number name to text', () => {
            expect(getBinding({ input: 'range', name: 'Opacity' }).name).toBe(
                'Opacity'
            );
            expect(getBinding({ input: 'range', name: 3 }).name).toBe('3');
        });

        it.each([
            ['text', 'a,b'],
            ['a number', 2],
            ['an object', { 0: 'a', 1: 'b' }]
        ])('drops options and labels that are %s', (_kind, value) => {
            const bind = getBinding({
                input: 'select',
                options: value,
                labels: value
            });
            expect(bind).not.toHaveProperty('options');
            expect(bind).not.toHaveProperty('labels');
        });

        it('keeps options and labels that are arrays', () => {
            expect(
                getBinding({
                    input: 'select',
                    options: [null, 'a'],
                    labels: ['All', 7]
                })
            ).toEqual({
                input: 'select',
                options: [null, 'a'],
                labels: ['All', 7]
            });
        });

        it('copies every other property as it is', () => {
            const bind = {
                input: 'range',
                min: 0,
                max: '10',
                debounce: 50,
                placeholder: { text: 'not text' }
            };
            expect(getBinding(bind)).toEqual(bind);
        });

        it('builds the key from the sanitised binding', () => {
            const unnamed = getKey({ input: 'select' });
            expect(
                getKey({ input: 'select', name: { style: { color: 'red' } } })
            ).toBe(unnamed);
            expect(getKey({ input: 'select', options: 'a,b' })).toBe(unnamed);
            expect(getKey({ input: 'select', name: 'Label' })).not.toBe(
                unnamed
            );
        });
    });

    it('finds parameter and selection inputs in compiled Vega-Lite and ignores a legend binding', () => {
        const compiled = compileVegaLite({
            data: VEGA_LITE_DATA,
            params: [
                {
                    name: 'opacityVal',
                    value: 0.5,
                    bind: { input: 'range', min: 0, max: 1, step: 0.1 }
                },
                { name: 'showLabels', value: true, bind: { input: 'checkbox' } }
            ],
            layer: [
                {
                    params: [
                        {
                            name: 'org',
                            select: { type: 'point', fields: ['o'] },
                            bind: {
                                input: 'select',
                                options: [null, 'Europe', 'Japan']
                            }
                        },
                        {
                            name: 'legendSel',
                            select: { type: 'point', fields: ['o'] },
                            bind: 'legend'
                        }
                    ],
                    mark: 'point',
                    encoding: {
                        x: { field: 'c', type: 'quantitative' },
                        y: { field: 'y', type: 'quantitative' },
                        color: { field: 'o', type: 'nominal' }
                    }
                }
            ]
        });
        expect(namesOf(getBoundSignals(compiled))).toEqual([
            'org_o',
            'opacityVal',
            'showLabels'
        ]);
    });

    it('finds one bound signal for each projected field of a selection', () => {
        const compiled = compileVegaLite({
            data: VEGA_LITE_DATA,
            params: [
                {
                    name: 'pick',
                    select: { type: 'point', fields: ['c', 'y'] },
                    bind: {
                        c: { input: 'range', min: 0, max: 10, step: 1 },
                        y: { input: 'range', min: 0, max: 5, step: 1 }
                    }
                }
            ],
            mark: 'point',
            encoding: {
                x: { field: 'c', type: 'quantitative' },
                y: { field: 'y', type: 'quantitative' }
            }
        });
        expect(namesOf(getBoundSignals(compiled)).sort()).toEqual([
            'pick_c',
            'pick_y'
        ]);
    });

    it('records init for a Vega-Lite selection that has an initial value', () => {
        const compiled = compileVegaLite({
            data: VEGA_LITE_DATA,
            params: [
                {
                    name: 'org',
                    value: [{ o: 'Japan' }],
                    select: { type: 'point', fields: ['o'] },
                    bind: {
                        input: 'select',
                        options: [null, 'Europe', 'Japan']
                    }
                }
            ],
            mark: 'point',
            encoding: {
                x: { field: 'c', type: 'quantitative' },
                y: { field: 'y', type: 'quantitative' }
            }
        });
        const [org] = getBoundSignals(compiled);
        expect(org.name).toBe('org_o');
        expect(org.init).toBe('"Japan"');
        expect(org).not.toHaveProperty('value');
    });
});

describe('getHeldValue', () => {
    const [slider, chosen] = getBoundSignals(VEGA_SPEC);

    it('returns the held value when it was captured under this definition', () => {
        const held: HeldBoundValues = { slider: { key: slider.key, value: 8 } };
        expect(getHeldValue(slider, held)).toBe(8);
    });

    it('returns a held null rather than falling back', () => {
        const held: HeldBoundValues = {
            slider: { key: slider.key, value: null }
        };
        expect(getHeldValue(slider, held)).toBeNull();
    });

    it('falls back to the definition value when the held key differs', () => {
        const held: HeldBoundValues = { slider: { key: 'other', value: 8 } };
        expect(getHeldValue(slider, held)).toBe(5);
    });

    it('returns undefined when nothing is held and the definition has no value', () => {
        expect(getHeldValue(chosen, {})).toBeUndefined();
    });
});

describe('getSeedValues', () => {
    const boundSignals = getBoundSignals({
        signals: [
            { name: 'a', value: 1, bind: { input: 'range' } },
            { name: 'b', value: true, bind: { input: 'checkbox' } },
            { name: 'c', value: 'x', bind: { input: 'text' } },
            { name: 'constructor', value: 1, bind: { input: 'range' } }
        ]
    } as unknown as Spec);
    const [a, b, c] = boundSignals;

    it('includes held values captured under the current definitions, however falsy', () => {
        const held: HeldBoundValues = {
            a: { key: a.key, value: 0 },
            b: { key: b.key, value: false },
            c: { key: c.key, value: null }
        };
        expect(getSeedValues(boundSignals, held)).toEqual({
            a: 0,
            b: false,
            c: null
        });
    });

    it('leaves out held values with another key and names that are not bound', () => {
        const held: HeldBoundValues = {
            a: { key: 'stale', value: 9 },
            unknown: { key: a.key, value: 9 }
        };
        expect(getSeedValues(boundSignals, held)).toEqual({});
    });

    it('does not treat an inherited property as a held value', () => {
        expect(getSeedValues(boundSignals, {})).toEqual({});
    });
});
