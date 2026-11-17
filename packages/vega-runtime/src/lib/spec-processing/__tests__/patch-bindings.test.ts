import { describe, expect, it } from 'vitest';
import type { Spec } from 'vega';

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
            }
        ],
        marks: []
    }) as unknown as Spec;

type LooseSpec = {
    config: { background?: string; events: Record<string, unknown> };
    signals: Record<string, unknown>[];
};

const loose = (spec: Spec) => spec as unknown as LooseSpec;

describe('patchSpecForBindings', () => {
    it('switches input bindings off and keeps the rest of the config', () => {
        const patched = loose(patchSpecForBindings(createSpec()));
        expect(patched.config.events.bind).toBe('none');
        expect(patched.config.events.defaults).toEqual({ allow: [] });
        expect(patched.config.background).toBe('white');
    });

    it('adds the config when the spec has none', () => {
        const patched = loose(
            patchSpecForBindings({ marks: [] } as unknown as Spec)
        );
        expect(patched.config.events).toEqual({ bind: 'none' });
    });

    it('does not mutate the spec it is given', () => {
        const spec = createSpec();
        const before = structuredClone(spec);
        patchSpecForBindings(spec);
        expect(spec).toEqual(before);
    });

    it('leaves the signals untouched', () => {
        const spec = createSpec();
        const patched = loose(patchSpecForBindings(spec));
        expect(patched.signals).toBe(loose(spec).signals);
    });
});
