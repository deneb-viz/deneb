import { describe, expect, it } from 'vitest';
import { tickStep } from 'd3-array';

import {
    getBindingControlKind,
    getBindingLabel,
    getInputProperties,
    getInputType,
    getInputValue,
    getOptionLabel,
    getRangeAttributes,
    getSelectedOptionIndex
} from '../binding-controls';
import type { BoundSignal } from '../bound-signals';

describe('getBindingControlKind', () => {
    it.each(['range', 'checkbox', 'radio', 'select', 'color'])(
        'recognises %s',
        (input) => {
            expect(getBindingControlKind({ input })).toBe(input);
        }
    );

    it.each(['text', 'number', 'date', 'anything-else'])(
        'treats %s as a generic input',
        (input) => {
            expect(getBindingControlKind({ input })).toBe('input');
        }
    );
});

describe('getBindingLabel', () => {
    const boundSignal = (name?: string): BoundSignal => ({
        name: 'opacityVal',
        bind: { input: 'range', ...(name !== undefined && { name }) },
        key: 'key'
    });

    it('uses the binding name when there is one', () => {
        expect(getBindingLabel(boundSignal('Opacity'))).toBe('Opacity');
    });

    it('falls back to the signal name', () => {
        expect(getBindingLabel(boundSignal())).toBe('opacityVal');
        expect(getBindingLabel(boundSignal(''))).toBe('opacityVal');
    });
});

describe('getRangeAttributes', () => {
    it('uses the binding min, max and step when given', () => {
        expect(
            getRangeAttributes(
                { input: 'range', min: 0, max: 1, step: 0.1 },
                0.5
            )
        ).toEqual({ min: 0, max: 1, step: 0.1, value: 0.5 });
    });

    it('defaults to zero to one hundred in steps of one', () => {
        expect(getRangeAttributes({ input: 'range' }, 50)).toEqual({
            min: 0,
            max: 100,
            step: 1,
            value: 50
        });
    });

    it('widens the default max to hold a larger value', () => {
        expect(getRangeAttributes({ input: 'range' }, 250)).toEqual({
            min: 0,
            max: 250,
            step: tickStep(0, 250, 100),
            value: 250
        });
    });

    it('lowers the default min to hold a negative value', () => {
        expect(getRangeAttributes({ input: 'range' }, -20).min).toBe(-20);
    });

    it('shows the midpoint when the signal has no value', () => {
        expect(
            getRangeAttributes({ input: 'range', min: 0, max: 10 }, undefined)
                .value
        ).toBe(5);
        expect(getRangeAttributes({ input: 'range' }, undefined).value).toBe(
            50
        );
    });

    it('reads a null value as zero', () => {
        expect(getRangeAttributes({ input: 'range' }, null).value).toBe(0);
    });

    it('treats an explicit min of 0 as absent, as Vega does', () => {
        expect(getRangeAttributes({ input: 'range', min: 0 }, -20).min).toBe(
            -20
        );
    });

    it('keeps a given min and max when the value falls outside them', () => {
        expect(
            getRangeAttributes({ input: 'range', min: 0, max: 10 }, 50)
        ).toMatchObject({ min: 0, max: 10, value: 50 });
    });

    it('derives the step from the range when none is given', () => {
        expect(
            getRangeAttributes({ input: 'range', min: 0, max: 1 }, 0.5).step
        ).toBe(0.01);
    });
});

describe('getSelectedOptionIndex', () => {
    const bind = { input: 'select', options: [null, 'Europe', 3] };

    it('finds an identical option', () => {
        expect(getSelectedOptionIndex(bind, 'Europe')).toBe(1);
        expect(getSelectedOptionIndex(bind, null)).toBe(0);
    });

    it('finds an option whose string form matches', () => {
        expect(getSelectedOptionIndex(bind, '3')).toBe(2);
    });

    it('returns -1 when nothing matches or there are no options', () => {
        expect(getSelectedOptionIndex(bind, 'Japan')).toBe(-1);
        expect(getSelectedOptionIndex({ input: 'select' }, 'Japan')).toBe(-1);
    });
});

describe('getOptionLabel', () => {
    it('uses the label at the same position', () => {
        expect(
            getOptionLabel(
                { input: 'select', options: [null, 'a'], labels: ['All', 'A'] },
                0
            )
        ).toBe('All');
    });

    it('falls back to the option as text', () => {
        expect(getOptionLabel({ input: 'select', options: [null, 3] }, 1)).toBe(
            '3'
        );
        expect(getOptionLabel({ input: 'select', options: [null, 3] }, 0)).toBe(
            'null'
        );
    });
});

describe('getInputType', () => {
    it('keeps a type that the input control supports', () => {
        expect(getInputType({ input: 'number' })).toBe('number');
        expect(getInputType({ input: 'datetime-local' })).toBe(
            'datetime-local'
        );
    });

    it('falls back to text for any other type', () => {
        expect(getInputType({ input: 'file' })).toBe('text');
        expect(getInputType({ input: 'made-up' })).toBe('text');
    });
});

describe('getInputProperties', () => {
    it('passes the allowed attributes under their React property names', () => {
        expect(
            getInputProperties({
                input: 'text',
                placeholder: 'Search',
                autocomplete: 'off',
                maxlength: 10,
                minlength: 2,
                min: 0,
                max: 5,
                step: 1,
                pattern: '[a-z]+'
            })
        ).toEqual({
            placeholder: 'Search',
            autoComplete: 'off',
            maxLength: 10,
            minLength: 2,
            min: 0,
            max: 5,
            step: 1,
            pattern: '[a-z]+'
        });
    });

    it('drops everything else, including event handlers and style', () => {
        expect(
            getInputProperties({
                input: 'text',
                onclick: 'alert(1)',
                style: 'color: red',
                name: 'Label',
                debounce: 100
            })
        ).toEqual({});
    });

    it('drops an allowed attribute whose value is not text or a number', () => {
        expect(
            getInputProperties({ input: 'text', placeholder: { a: 1 } })
        ).toEqual({});
    });
});

describe('getInputValue', () => {
    it('shows an empty input for a missing value', () => {
        expect(getInputValue(undefined)).toBe('');
        expect(getInputValue(null)).toBe('');
    });

    it('shows any other value as text', () => {
        expect(getInputValue(3)).toBe('3');
        expect(getInputValue('abc')).toBe('abc');
    });
});
