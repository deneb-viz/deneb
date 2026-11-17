import type { Spec, View } from 'vega';
import {
    patchSpecForBindings,
    type BoundSignal
} from '@deneb-viz/vega-runtime/spec-processing';
import { applyHeldBoundValues } from '@deneb-viz/vega-runtime/view';
import { logDebug } from '@deneb-viz/utils/logging';

import { getDenebState } from '../../state';

/**
 * Shared empty list, so that a view without bound signals always gets the
 * same array.
 */
const NO_BOUND_SIGNALS: BoundSignal[] = [];

/** The bound signals each patched spec was built from. */
const boundSignalsBySpec = new WeakMap<object, BoundSignal[]>();

/** The bound signals each embedded view was built from. */
const boundSignalsByView = new WeakMap<View, BoundSignal[]>();

/**
 * The `patch` option Deneb passes to vega-embed. vega-embed calls it with
 * the compiled Vega spec, for Vega and Vega-Lite alike, before parsing it.
 *
 * It switches Vega's own binding form off, and records the bound signals
 * that are current in the store against the spec it returns. vega-embed
 * returns that same object as `vgSpec`, which is how `bindEmbeddedView`
 * finds them for the new view.
 *
 * This is a module-level constant that reads the store when called. Its
 * identity never changes, which matters because `useVegaEmbed` re-embeds
 * whenever an option's identity does.
 */
export const patchCompiledSpecForBindings = (spec: Spec): Spec => {
    const patched = patchSpecForBindings(spec);
    boundSignalsBySpec.set(
        patched,
        getDenebState().compilation.result?.parsed.boundSignals ??
            NO_BOUND_SIGNALS
    );
    return patched;
};

/**
 * Tie a newly embedded view to the bound signals its spec was built from,
 * and write the held values to it. Call it once the view has completed its
 * first run, with the `vgSpec` vega-embed returned for it.
 *
 * The parse result in the store can be newer than the view: a recompile
 * replaces it while the next embed is still in flight. Recording the view's
 * own list keeps the values of the old view from being reported under the
 * definitions of the new one.
 */
export const bindEmbeddedView = (
    view: View,
    vgSpec: object | undefined
): void => {
    const boundSignals =
        vgSpec === undefined
            ? NO_BOUND_SIGNALS
            : (boundSignalsBySpec.get(vgSpec) ?? NO_BOUND_SIGNALS);
    boundSignalsByView.set(view, boundSignals);
    applyHeldBoundValues({
        view,
        boundSignals,
        heldValues: getDenebState().bindings.heldValues,
        onError: (error) =>
            logDebug('Held bound values: the view run failed', { error })
    });
};

/**
 * The bound signals a view was built from. A view that was never bound gets
 * the shared empty list, so the result for a view is always the same array.
 */
export const getViewBoundSignals = (view: View): BoundSignal[] =>
    boundSignalsByView.get(view) ?? NO_BOUND_SIGNALS;
