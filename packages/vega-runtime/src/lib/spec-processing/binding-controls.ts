import { tickStep } from 'd3-array';
import { color } from 'd3-color';

import type { BoundSignal, BoundSignalBinding } from './bound-signals';

/**
 * The kinds of control Deneb renders. Vega has dedicated widgets for the
 * first four; `color` is a generic input that needs a native colour control;
 * everything else is a generic input.
 */
export type BindingControlKind =
    | 'range'
    | 'checkbox'
    | 'radio'
    | 'select'
    | 'color'
    | 'input';

export const getBindingControlKind = (
    bind: BoundSignalBinding
): BindingControlKind => {
    switch (bind.input) {
        case 'range':
        case 'checkbox':
        case 'radio':
        case 'select':
        case 'color':
            return bind.input;
        default:
            return 'input';
    }
};

/**
 * The text shown beside a control: the binding's `name`, or the signal name.
 *
 * Always text, even though the binding is sanitised when it is read: the
 * label is rendered through a component slot, where an object would be read
 * as properties.
 */
export const getBindingLabel = (boundSignal: BoundSignal): string =>
    String(boundSignal.bind.name || boundSignal.name);

export type RangeAttributes = {
    min: number;
    max: number;
    step: number;
    value: number;
};

/**
 * Slider attributes, defaulted the way Vega's range widget defaults them.
 * With no signal value the slider shows the midpoint, as a browser does for
 * a range input that has no valid value. Like Vega, an explicit `min` or
 * `step` of 0 counts as absent.
 */
export const getRangeAttributes = (
    bind: BoundSignalBinding,
    signalValue: unknown
): RangeAttributes => {
    const requested =
        signalValue !== undefined
            ? Number(signalValue)
            : (Number(bind.max) + Number(bind.min)) / 2;
    const max =
        bind.max != null ? Number(bind.max) : Math.max(100, requested) || 100;
    const min = Number(bind.min) || Math.min(0, max, requested) || 0;
    const step = Number(bind.step) || tickStep(min, max, 100);
    const value = Number.isFinite(requested) ? requested : (min + max) / 2;
    return { min, max, step, value };
};

/**
 * Vega's own test for whether an option is the current value: identical, or
 * equal once both are converted to text.
 */
const isSameOptionValue = (option: unknown, value: unknown): boolean =>
    option === value || String(option) === String(value);

/**
 * The position of the option that matches the signal value, or -1.
 */
export const getSelectedOptionIndex = (
    bind: BoundSignalBinding,
    signalValue: unknown
): number =>
    (bind.options ?? []).findIndex((option) =>
        isSameOptionValue(option, signalValue)
    );

/**
 * The text for one option: its label, or the option itself as text.
 */
export const getOptionLabel = (
    bind: BoundSignalBinding,
    index: number
): string => String((bind.labels ?? [])[index] || (bind.options ?? [])[index]);

/**
 * The option a radio group or a select writes for the chosen position. Vega
 * writes the option itself, so its type is kept.
 */
export const getOptionAtIndex = (
    bind: BoundSignalBinding,
    index: string
): unknown => (index === '' ? undefined : (bind.options ?? [])[Number(index)]);

const SUPPORTED_INPUT_TYPES = [
    'text',
    'email',
    'password',
    'search',
    'tel',
    'url',
    'date',
    'datetime-local',
    'month',
    'number',
    'time',
    'week'
] as const;

/** The input types the generic input control can render. */
export type BindingInputType = (typeof SUPPORTED_INPUT_TYPES)[number];

const isSupportedInputType = (input: string): input is BindingInputType =>
    (SUPPORTED_INPUT_TYPES as readonly string[]).includes(input);

/**
 * The `type` for a generic input. A type the input control cannot render
 * falls back to text. Vega passes any type through.
 */
export const getInputType = (bind: BoundSignalBinding): BindingInputType =>
    isSupportedInputType(bind.input) ? bind.input : 'text';

/**
 * The binding properties a generic input may receive, mapped to their React
 * property names. Vega copies every binding property onto the element; an
 * allowlist keeps event handlers, `style` and anything unexpected out.
 */
const INPUT_PROPERTY_NAMES: Record<string, string> = {
    placeholder: 'placeholder',
    autocomplete: 'autoComplete',
    min: 'min',
    max: 'max',
    step: 'step',
    minlength: 'minLength',
    maxlength: 'maxLength',
    pattern: 'pattern'
};

export const getInputProperties = (
    bind: BoundSignalBinding
): Record<string, string | number> => {
    const properties: Record<string, string | number> = {};
    for (const [attribute, property] of Object.entries(INPUT_PROPERTY_NAMES)) {
        const value = bind[attribute];
        if (typeof value === 'string' || typeof value === 'number') {
            properties[property] = value;
        }
    }
    return properties;
};

/**
 * The text a generic input shows for a signal value. A missing value shows as
 * empty rather than as the text `undefined`.
 */
export const getInputValue = (signalValue: unknown): string =>
    signalValue === undefined || signalValue === null
        ? ''
        : String(signalValue);

/**
 * The value for a native colour input, which accepts only `#rrggbb`. Any
 * CSS colour is converted, so the control shows the signal's colour where
 * Vega's own form would show black. A value that is not a colour gives
 * black.
 */
export const getColorInputValue = (signalValue: unknown): string =>
    color(String(signalValue))?.formatHex() ?? '#000000';
