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

    // Issue #753: Power BI null-pads the highlights array, so a row outside
    // an active highlight arrives as a present base value with a null
    // comparator. It must report 'off', not 'on'.
    it('is off for a present base value with a null comparator', () => {
        expect(
            getHighlightStatusValue(true, asValue(8.4), asValue(null))
        ).toBe('off');
    });

    // Ambiguous shape (deliberate): a null base with a null comparator is
    // indistinguishable from a null measure inside the highlight, so the
    // long-standing 'on' result is preserved.
    it('remains on when both base value and comparator are null', () => {
        expect(
            getHighlightStatusValue(true, asValue(null), asValue(null))
        ).toBe('on');
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

    // L13 symmetry: an absent (undefined) comparator has no value to compare
    // against; 'neq' is the deliberate fallback (there is no 'absent' member),
    // mirroring getHighlightStatusValue's undefined → 'off' guard.
    it('returns neq for an undefined out-of-bounds comparator', () => {
        expect(
            getHighlightComparatorValue(asValue(100), asValue(undefined))
        ).toBe('neq');
    });
});
