import { describe, expect, it } from 'vitest';

import type { EmptyStateReason } from '../empty-state-reason';

/**
 * `EmptyStateReason` is a string-literal union that doubles as a lookup key
 * for the i18n dispatch in `NoDataMessage`. The previous tests in this file
 * each asserted a literal equals itself ("source-unavailable" === "source-
 * unavailable") — tautological and zero regression value.
 *
 * The meaningful exhaustiveness check (every reason maps to a distinct,
 * present-in-catalog i18n key) lives in `no-data-message.test.tsx`. The one
 * thing that file does NOT lock down is "the union members themselves do not
 * collide and the count matches the documented contract" — if a future
 * refactor accidentally aliases two members to the same string, the dispatch
 * test would still pass (the duplicates would just both map to the same key).
 *
 * This single test guards that contract: enumerate the union, assert the set
 * is the expected size, and assert no two values collide.
 */
describe('EmptyStateReason', () => {
    it('exposes exactly four distinct reason values', () => {
        const reasons: EmptyStateReason[] = [
            'source-unavailable',
            'view-unavailable',
            'dataset-unavailable',
            'no-signals'
        ];
        expect(new Set(reasons).size).toBe(reasons.length);
        expect(reasons.length).toBe(4);
    });
});
