import type { Spec } from 'vega';

import { hasOwn, isRecord } from './object-guards';

/**
 * Give one signal its held value. A signal with an `update` expression is
 * returned untouched, because Vega re-evaluates the expression on every new
 * view. `init` is removed, because it would override `value`.
 */
const seedSignal = (
    signal: unknown,
    seedValues: Record<string, unknown>
): unknown => {
    if (
        !isRecord(signal) ||
        typeof signal.name !== 'string' ||
        !hasOwn(seedValues, signal.name) ||
        signal.update !== undefined
    ) {
        return signal;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { init, ...rest } = signal;
    return { ...rest, value: seedValues[signal.name] };
};

/**
 * Prepare a compiled Vega spec for controls that Deneb renders itself.
 *
 * - Sets `config.events.bind` to `'none'`, so Vega builds no binding form.
 * - Seeds each signal named in `seedValues` with that value.
 *
 * Returns a new spec. The input is never mutated: the compiled template it
 * comes from is reused across embeds.
 */
export const patchSpecForBindings = (
    spec: Spec,
    seedValues: Record<string, unknown>
): Spec => {
    const source = spec as unknown as Record<string, unknown>;
    const config = isRecord(source.config) ? source.config : {};
    const events = isRecord(config.events) ? config.events : {};
    const patched: Record<string, unknown> = {
        ...source,
        config: { ...config, events: { ...events, bind: 'none' } }
    };
    if (Array.isArray(source.signals)) {
        patched.signals = source.signals.map((signal: unknown) =>
            seedSignal(signal, seedValues)
        );
    }
    return patched as unknown as Spec;
};
