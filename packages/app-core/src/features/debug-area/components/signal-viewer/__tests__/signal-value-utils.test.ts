import { describe, expect, it, vi } from 'vitest';

import { DATA_TABLE_VALUE_MAX_LENGTH } from '../../../constants';
import {
    computeSignalDisplay,
    INVALID_SIGNAL_DISPLAY
} from '../signal-value-utils';

const TOO_LONG = '__PLACEHOLDER__';
const translate = () => TOO_LONG;

describe('computeSignalDisplay', () => {
    it('reports valueType from the unpruned value', () => {
        expect(computeSignalDisplay(42, translate).valueType).toBe('number');
        expect(computeSignalDisplay('hello', translate).valueType).toBe(
            'string'
        );
        expect(computeSignalDisplay(true, translate).valueType).toBe('boolean');
        expect(computeSignalDisplay({ a: 1 }, translate).valueType).toBe(
            'object'
        );
        expect(computeSignalDisplay([1, 2], translate).valueType).toBe('array');
    });

    it('returns the stringified value as display when under the length budget', () => {
        const result = computeSignalDisplay({ a: 1 }, translate);
        expect(result.tooLong).toBe(false);
        expect(result.display).toContain('"a": 1');
    });

    it('substitutes the placeholder when stringified length exceeds the budget', () => {
        const long = 'x'.repeat(DATA_TABLE_VALUE_MAX_LENGTH + 50);
        const result = computeSignalDisplay(long, translate);
        expect(result.tooLong).toBe(true);
        expect(result.display).toBe(TOO_LONG);
    });

    it('does not substitute the placeholder for exactly-at-budget stringified values', () => {
        // A raw string of exactly MAX length round-trips as a JSON-quoted
        // string (surrounded by `"…"`) that is MAX + 2 chars, which WOULD
        // exceed the budget. Use a value whose stringified form is exactly
        // MAX instead — e.g. a string of MAX - 2 characters.
        const exactAtBudget = 'y'.repeat(DATA_TABLE_VALUE_MAX_LENGTH - 2);
        const result = computeSignalDisplay(exactAtBudget, translate);
        expect(result.display.length).toBe(DATA_TABLE_VALUE_MAX_LENGTH);
        expect(result.tooLong).toBe(false);
    });

    it('flips to tooLong at one character over the budget', () => {
        // Stringified length = raw length + 2 (the JSON quotes). Raw of
        // MAX - 1 chars → stringified of MAX + 1 → tooLong true.
        const justOverBudget = 'z'.repeat(DATA_TABLE_VALUE_MAX_LENGTH - 1);
        const result = computeSignalDisplay(justOverBudget, translate);
        expect(result.tooLong).toBe(true);
    });

    it('treats a nullable stringifyPruned return as an empty display, never a false negative tooLong', () => {
        const result = computeSignalDisplay(undefined, translate);
        // stringifyPruned(undefined) returns undefined under the hood; the
        // helper normalises to '' so the length comparison is always
        // well-defined. Bug we are guarding against: `undefined > N` is
        // `false`, which would leave display === undefined — rendered as
        // an empty cell with no user-visible error.
        expect(result.tooLong).toBe(false);
        expect(typeof result.display).toBe('string');
    });

    it('invokes the translator only when the value overflows', () => {
        const spy = vi.fn(() => TOO_LONG);
        computeSignalDisplay({ x: 1 }, spy);
        expect(spy).not.toHaveBeenCalled();

        const long = 'x'.repeat(DATA_TABLE_VALUE_MAX_LENGTH + 50);
        computeSignalDisplay(long, spy);
        expect(spy).toHaveBeenCalledWith('Table_Placeholder_TooLong');
    });
});

describe('INVALID_SIGNAL_DISPLAY', () => {
    it('is a stable sentinel for failure paths', () => {
        expect(INVALID_SIGNAL_DISPLAY).toEqual({
            raw: null,
            display: '',
            valueType: 'invalid',
            tooLong: false
        });
    });
});
