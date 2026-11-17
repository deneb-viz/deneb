import type { Spec } from 'vega';

import { isRecord } from './object-guards';

/**
 * Prepare a compiled Vega spec for controls that Deneb renders itself, by
 * setting `config.events.bind` to `'none'` so that Vega builds no binding
 * form.
 *
 * Returns a new spec. The input is never mutated: the compiled template it
 * comes from is reused across embeds.
 */
export const patchSpecForBindings = (spec: Spec): Spec => {
    const source = spec as unknown as Record<string, unknown>;
    const config = isRecord(source.config) ? source.config : {};
    const events = isRecord(config.events) ? config.events : {};
    const patched: Record<string, unknown> = {
        ...source,
        config: { ...config, events: { ...events, bind: 'none' } }
    };
    return patched as unknown as Spec;
};
