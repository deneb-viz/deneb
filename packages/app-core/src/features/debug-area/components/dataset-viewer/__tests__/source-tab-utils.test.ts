import { describe, expect, it } from 'vitest';

import {
    buildSourceMetadataSpec,
    resolveSourceTabReason
} from '../source-tab-utils';

/**
 * Unit 5 chose Option B (no first-update flag exists in the store, so
 * loading and empty collapse into a single `'source-unavailable'` reason).
 * These tests lock that in — a follow-up that introduces a flag can add a
 * dedicated `'source-loading'` case at the boundary.
 */
describe('resolveSourceTabReason', () => {
    it('returns "source-unavailable" for an empty dataset', () => {
        expect(resolveSourceTabReason([])).toBe('source-unavailable');
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

describe('buildSourceMetadataSpec', () => {
    it('includes row count and sorted support-field names', () => {
        const spec = buildSourceMetadataSpec([
            { __highlight__: 1, __format__: 'x', name: 'foo' },
            { __highlight__: 0 }
        ]);
        expect(spec.rowCount).toBe(2);
        expect(spec.supportFields).toEqual(['__format__', '__highlight__']);
        expect(spec.errorBadge).toBe(false);
    });

    it('returns rowCount 0 and no support fields for an empty dataset', () => {
        const spec = buildSourceMetadataSpec([]);
        expect(spec.rowCount).toBe(0);
        expect(spec.supportFields).toEqual([]);
        expect(spec.errorBadge).toBe(false);
    });

    it('returns an empty support-field list when the first row has no support keys', () => {
        const spec = buildSourceMetadataSpec([{ foo: 1, bar: 2 }]);
        expect(spec.rowCount).toBe(1);
        expect(spec.supportFields).toEqual([]);
    });

    it('never raises the error badge from the Source tab', () => {
        // Source never raises the error badge; Unit 6 sets it from the
        // Data tab's reason. This test guards against an accidental flip.
        const spec = buildSourceMetadataSpec([{ __highlight__: 1 }]);
        expect(spec.errorBadge).toBe(false);
    });
});
