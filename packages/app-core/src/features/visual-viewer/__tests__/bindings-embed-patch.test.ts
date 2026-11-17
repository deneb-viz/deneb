import { describe, expect, it } from 'vitest';
import type { Spec } from 'vega';

import { getDenebState } from '../../../state';
import { patchCompiledSpecForBindings } from '../bindings-embed-patch';

const SOURCE = {
    $schema: 'https://vega.github.io/schema/vega/v6.json',
    signals: [{ name: 'slider', value: 5, bind: { input: 'range' } }],
    marks: []
};

type LooseSpec = {
    config: { events: { bind: string } };
    signals: { name: string; value: unknown }[];
};

const patch = () =>
    patchCompiledSpecForBindings(
        SOURCE as unknown as Spec
    ) as unknown as LooseSpec;

const compileSource = () => {
    getDenebState().compilation.compile({
        spec: JSON.stringify(SOURCE),
        config: '{}',
        provider: 'vega',
        containerDimensions: { width: 400, height: 300 }
    });
    return getDenebState().compilation.result?.parsed.boundSignals ?? [];
};

// The first test relies on a store that nothing has been compiled into, so
// it must stay first.
describe('patchCompiledSpecForBindings', () => {
    it('switches input bindings off when nothing is compiled or held', () => {
        const patched = patch();
        expect(patched.config.events.bind).toBe('none');
        expect(patched.signals[0].value).toBe(5);
    });

    it('seeds a bound signal with the value held in the store', () => {
        const boundSignals = compileSource();
        expect(boundSignals.map((signal) => signal.name)).toEqual(['slider']);
        getDenebState().bindings.setHeldValue('slider', {
            key: boundSignals[0].key,
            value: 9
        });
        expect(patch().signals[0].value).toBe(9);
    });

    it('ignores a held value captured under another definition', () => {
        const boundSignals = compileSource();
        expect(boundSignals).toHaveLength(1);
        getDenebState().bindings.setHeldValue('slider', {
            key: 'stale',
            value: 3
        });
        expect(patch().signals[0].value).toBe(5);
    });
});
