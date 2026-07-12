import { describe, it, expect } from 'vitest';
import {
    getHighlightComparatorValue,
    getHighlightStatusValue
} from '../highlight';
import type { PrimitiveValue } from '../types';

// Power BI can supply values outside the declared PrimitiveValue union at
// runtime — `null` for an un-highlighted row, or `undefined` from an
// out-of-bounds read of a short highlights array. Cast at the call site so the
// tests can exercise those runtime shapes.
const asValue = (v: unknown) => v as PrimitiveValue;

describe('getHighlightStatusValue', () => {
    it('is neutral when there are no highlights', () => {
        expect(
            getHighlightStatusValue(false, asValue(100), asValue(100))
        ).toBe('neutral');
    });

    it('is on when the row carries a highlight comparator', () => {
        expect(getHighlightStatusValue(true, asValue(100), asValue(75))).toBe(
            'on'
        );
    });

    it('keeps the null-field / present-comparator off case', () => {
        expect(
            getHighlightStatusValue(true, asValue(null), asValue(75))
        ).toBe('off');
    });

    // Audit L13: a highlights array shorter than values yields an undefined
    // comparator via an out-of-bounds read; it must not be reported as 'on'.
    it('is off (not on) for an undefined out-of-bounds comparator', () => {
        expect(
            getHighlightStatusValue(true, asValue(100), asValue(undefined))
        ).toBe('off');
    });
});

describe('getHighlightComparatorValue', () => {
    it('classifies the comparator against the base value', () => {
        expect(getHighlightComparatorValue(asValue(100), asValue(75))).toBe(
            'lt'
        );
        expect(getHighlightComparatorValue(asValue(100), asValue(100))).toBe(
            'eq'
        );
        expect(getHighlightComparatorValue(asValue(100), asValue(125))).toBe(
            'gt'
        );
    });
});
