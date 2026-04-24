import { describe, expect, it } from 'vitest';

import { detectSupportFields, getRowCount } from '../source-and-data-tab-utils';

describe('detectSupportFields', () => {
    it('returns support-field names from a row, sorted alphabetically', () => {
        const result = detectSupportFields({
            __highlight__: 1,
            __format__: 'x',
            name: 'foo'
        });
        expect(result).toEqual(['__format__', '__highlight__']);
    });

    it('returns [] for undefined', () => {
        expect(detectSupportFields(undefined)).toEqual([]);
    });

    it('returns [] for null', () => {
        expect(detectSupportFields(null)).toEqual([]);
    });

    it('returns [] for an empty object', () => {
        expect(detectSupportFields({})).toEqual([]);
    });

    it('ignores keys that do not bookend with double underscores', () => {
        // `_foo` — single-leading underscore; not a support field.
        // `foo_` — single-trailing underscore; not a support field.
        // `__foo` — missing trailing underscores; not a support field.
        // `foo__` — missing leading underscores; not a support field.
        const result = detectSupportFields({
            _foo: 1,
            foo_: 2,
            __foo: 3,
            foo__: 4,
            __real__: 5
        });
        expect(result).toEqual(['__real__']);
    });
});

describe('getRowCount', () => {
    it('returns the array length for a populated dataset', () => {
        expect(getRowCount(new Array(10))).toBe(10);
    });

    it('returns 0 for null', () => {
        expect(getRowCount(null)).toBe(0);
    });

    it('returns 0 for undefined', () => {
        expect(getRowCount(undefined)).toBe(0);
    });

    it('returns 0 for an empty array', () => {
        expect(getRowCount([])).toBe(0);
    });
});
