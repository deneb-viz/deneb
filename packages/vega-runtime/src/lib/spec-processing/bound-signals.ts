import type { Spec } from 'vega';

import { hasOwn, isRecord } from './object-guards';

/**
 * A Vega input binding that asks for a generated control: a `bind` with an
 * `input` type. Property names are Vega's own.
 */
export type BoundSignalBinding = {
    input: string;
    name?: string;
    debounce?: number;
    options?: unknown[];
    labels?: string[];
    min?: number;
    max?: number;
    step?: number;
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
     * their `bind`, `value`, `init` and `update` are all equal, so a value
     * captured under one key is never applied to a redefined signal. It
     * embeds the whole definition, so compare it in memory and do not
     * persist it.
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

const isBoundSignalBinding = (bind: unknown): bind is BoundSignalBinding =>
    isRecord(bind) && typeof bind.input === 'string';

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
        const bind = signal.bind;
        if (!isBoundSignalBinding(bind)) {
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
            key: JSON.stringify(definition)
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
export const getSeedValues = (
    boundSignals: BoundSignal[],
    heldValues: HeldBoundValues
): Record<string, unknown> => {
    const seedValues: Record<string, unknown> = {};
    for (const boundSignal of boundSignals) {
        const held = getApplicableHeldEntry(boundSignal, heldValues);
        if (held !== undefined) {
            seedValues[boundSignal.name] = held.value;
        }
    }
    return seedValues;
};
