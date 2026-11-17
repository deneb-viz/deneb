import type { Spec } from 'vega';
import {
    getSeedValues,
    patchSpecForBindings
} from '@deneb-viz/vega-runtime/spec-processing';

import { getDenebState } from '../../state';

/**
 * The `patch` option Deneb passes to vega-embed. vega-embed calls it with
 * the compiled Vega spec, for Vega and Vega-Lite alike, before parsing it.
 *
 * It switches Vega's own binding form off and seeds each bound signal with
 * its held value, so a rebuilt view starts where the last one left off.
 *
 * This is a module-level constant that reads the store when called. Its
 * identity never changes, which matters because `useVegaEmbed` re-embeds
 * whenever an option's identity does.
 */
export const patchCompiledSpecForBindings = (spec: Spec): Spec => {
    const { bindings, compilation } = getDenebState();
    const boundSignals = compilation.result?.parsed.boundSignals ?? [];
    return patchSpecForBindings(
        spec,
        getSeedValues(boundSignals, bindings.heldValues)
    );
};
