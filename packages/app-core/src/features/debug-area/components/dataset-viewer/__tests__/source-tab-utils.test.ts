import { describe, expect, it } from 'vitest';

import { resolveSourceTabReason } from '../source-tab-utils';

/**
 * `state.dataset.values` is `VegaDatum[]` and the store has no
 * first-update flag — so empty and undefined collapse into a single
 * `'source-unavailable'` reason.
 */
describe('resolveSourceTabReason', () => {
    it('returns "source-unavailable" for an empty dataset', () => {
        expect(resolveSourceTabReason([])).toBe('source-unavailable');
    });

    it('returns "source-unavailable" for an undefined dataset', () => {
        expect(resolveSourceTabReason(undefined)).toBe('source-unavailable');
    });

    it('returns null for a populated dataset', () => {
        expect(resolveSourceTabReason([{ a: 1 }])).toBeNull();
    });

    it('returns null for a dataset with multiple rows', () => {
        expect(
            resolveSourceTabReason([{ a: 1 }, { a: 2 }, { a: 3 }])
        ).toBeNull();
    });
});
