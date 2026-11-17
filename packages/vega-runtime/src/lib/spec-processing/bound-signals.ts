import type { Spec } from 'vega';

import { hasOwn, isRecord } from './object-guards';

/**
 * A Vega input binding that asks for a generated control: a `bind` with an
 * `input` type. Property names are Vega's own.
 */
export type BoundSignalBinding = {
    input: string;
    name?: string;
    options?: unknown[];
    labels?: unknown[];
    // Copied from the spec as written. The functions that read these
    // convert them.
    debounce?: unknown;
    min?: unknown;
    max?: unknown;
    step?: unknown;
    [property: string]: unknown;
};

/**
 * A top-level signal that Deneb renders a control for.
 */
export type BoundSignal = {
    name: string;
    bind: BoundSignalBinding;
    /** The signal's initial `value`, when the spec gives one. */
    value?: unknown;
    /** The signal's `init` expression, when the spec gives one. */
    init?: string;
    /** The signal's `update` expression, when the spec gives one. */
    update?: string;
    /**
     * Identifies this definition. Two bound signals share a key only when
     * everything that decides the signal's value is equal: `bind`, `value`,
     * `init`, `update`, the `on` event handlers and `react`. A value
     * captured under one key is therefore never applied to a redefined
     * signal. It embeds the whole definition, so compare it in memory and do
     * not persist it.
     */
    key: string;
};

/**
 * The last-known value of a bound signal, tagged with the definition it was
 * captured under.
 */
export type HeldBoundValue = {
    key: string;
    value: unknown;
};

export type HeldBoundValues = Record<string, HeldBoundValue>;

/**
 * A copy of a binding that is safe to render controls from, or undefined
 * when the binding does not ask for a generated control.
 *
 * A spec is free-form JSON. `name` is passed to component slots, which read
 * an object as properties, so only text or a number (as text) is kept.
 * `options` and `labels` are iterated, which throws on anything but an
 * array, so only arrays are kept. Every other property is copied as it is;
 * the functions that read them convert them.
 */
const sanitiseBinding = (bind: unknown): BoundSignalBinding | undefined => {
    if (!isRecord(bind)) {
        return undefined;
    }
    const { input, name, options, labels, ...otherProperties } = bind;
    if (typeof input !== 'string') {
        return undefined;
    }
    const binding: BoundSignalBinding = { ...otherProperties, input };
    if (typeof name === 'string' || typeof name === 'number') {
        binding.name = String(name);
    }
    if (Array.isArray(options)) {
        binding.options = options;
    }
    if (Array.isArray(labels)) {
        binding.labels = labels;
    }
    return binding;
};

/**
 * List the signals of a Vega spec that have a generated input binding, in
 * spec order. Vega only allows `bind` on top-level signals, so nested scopes
 * are not searched. For Vega-Lite, pass the compiled Vega spec.
 */
export const getBoundSignals = (spec: Spec): BoundSignal[] => {
    const signals: unknown = spec.signals;
    if (!Array.isArray(signals)) {
        return [];
    }
    const boundSignals: BoundSignal[] = [];
    for (const signal of signals) {
        if (!isRecord(signal) || typeof signal.name !== 'string') {
            continue;
        }
        const bind = sanitiseBinding(signal.bind);
        if (bind === undefined) {
            continue;
        }
        const definition = {
            bind,
            ...(signal.value !== undefined && { value: signal.value }),
            ...(typeof signal.init === 'string' && { init: signal.init }),
            ...(typeof signal.update === 'string' && {
                update: signal.update
            })
        };
        boundSignals.push({
            name: signal.name,
            ...definition,
            key: JSON.stringify({
                ...definition,
                ...(signal.on !== undefined && { on: signal.on }),
                ...(signal.react !== undefined && { react: signal.react })
            })
        });
    }
    return boundSignals;
};

/**
 * The held entry for a bound signal, if one was captured under its current
 * definition.
 */
const getApplicableHeldEntry = (
    boundSignal: BoundSignal,
    heldValues: HeldBoundValues
): HeldBoundValue | undefined => {
    if (!hasOwn(heldValues, boundSignal.name)) {
        return undefined;
    }
    const held = heldValues[boundSignal.name];
    return held?.key === boundSignal.key ? held : undefined;
};

/**
 * The value a control should show: the held value when one was captured
 * under this definition, otherwise the definition's own `value`. Undefined
 * when the signal has neither.
 */
export const getHeldValue = (
    boundSignal: BoundSignal,
    heldValues: HeldBoundValues
): unknown => {
    const held = getApplicableHeldEntry(boundSignal, heldValues);
    return held === undefined ? boundSignal.value : held.value;
};

/**
 * The held values that still apply, by signal name. A held `null`, `false`
 * or `0` is included: the test is whether a value is held, not whether it is
 * truthy.
 */
export const getApplicableHeldValues = (
    boundSignals: BoundSignal[],
    heldValues: HeldBoundValues
): Record<string, unknown> => {
    const applicableHeldValues: Record<string, unknown> = {};
    for (const boundSignal of boundSignals) {
        const held = getApplicableHeldEntry(boundSignal, heldValues);
        if (held !== undefined) {
            applicableHeldValues[boundSignal.name] = held.value;
        }
    }
    return applicableHeldValues;
};
