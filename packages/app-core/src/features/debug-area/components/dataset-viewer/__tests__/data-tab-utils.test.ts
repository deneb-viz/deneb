import { describe, expect, it } from 'vitest';

import { buildDataMetadataSpec, resolveDataTabReason } from '../data-tab-utils';

/**
 * The Data tab's reason mapping is two-way (view-unavailable vs
 * dataset-unavailable). `VegaViewServices.getDataByName()` swallows
 * transform errors and returns `undefined`, so the call-site cannot
 * distinguish "not registered" from "transform failure" — both land as
 * `'dataset-unavailable'` by design (see plan Unit 6).
 */
describe('resolveDataTabReason', () => {
    it("returns 'view-unavailable' when the view is not available (regardless of name)", () => {
        expect(resolveDataTabReason(false, 'anything', undefined)).toBe(
            'view-unavailable'
        );
    });

    it("returns 'view-unavailable' when the view is not available, even with an empty name", () => {
        expect(resolveDataTabReason(false, '', undefined)).toBe(
            'view-unavailable'
        );
    });

    it("returns 'view-unavailable' when the view is not available but values are defined", () => {
        expect(resolveDataTabReason(false, 'dataset', [{ a: 1 }])).toBe(
            'view-unavailable'
        );
    });

    it("returns 'dataset-unavailable' when the view is available but the name is empty", () => {
        expect(resolveDataTabReason(true, '', undefined)).toBe(
            'dataset-unavailable'
        );
    });

    it("returns 'dataset-unavailable' when the view is available but values are undefined", () => {
        expect(resolveDataTabReason(true, 'name', undefined)).toBe(
            'dataset-unavailable'
        );
    });

    it("returns 'dataset-unavailable' when both the name is empty AND values are undefined", () => {
        expect(resolveDataTabReason(true, '', undefined)).toBe(
            'dataset-unavailable'
        );
    });

    it('returns null for a valid view + name + empty array (zero rows is still renderable)', () => {
        expect(resolveDataTabReason(true, 'name', [])).toBeNull();
    });

    it('returns null for a valid view + name + populated array', () => {
        expect(resolveDataTabReason(true, 'name', [{ a: 1 }])).toBeNull();
    });

    it('returns null for a valid view + name + multi-row array', () => {
        expect(
            resolveDataTabReason(true, 'name', [{ a: 1 }, { a: 2 }, { a: 3 }])
        ).toBeNull();
    });
});

describe('buildDataMetadataSpec', () => {
    it('includes row count and no error badge for a populated dataset', () => {
        const spec = buildDataMetadataSpec([{ a: 1 }, { a: 2 }], false);
        expect(spec.rowCount).toBe(2);
        expect(spec.errorBadge).toBe(false);
    });

    it('omits supportFields (Data tab does not surface support-field badges)', () => {
        const spec = buildDataMetadataSpec([{ a: 1, __highlight__: 1 }], false);
        expect(spec.supportFields).toBeUndefined();
    });

    it('returns rowCount 0 and errorBadge true when values are undefined and hasError is true', () => {
        const spec = buildDataMetadataSpec(undefined, true);
        expect(spec.rowCount).toBe(0);
        expect(spec.errorBadge).toBe(true);
    });

    it('returns rowCount 0 and errorBadge false for an empty dataset with no error', () => {
        const spec = buildDataMetadataSpec([], false);
        expect(spec.rowCount).toBe(0);
        expect(spec.errorBadge).toBe(false);
    });

    it('raises the error badge when hasError is true, even for a populated dataset', () => {
        const spec = buildDataMetadataSpec([{ a: 1 }], true);
        expect(spec.rowCount).toBe(1);
        expect(spec.errorBadge).toBe(true);
    });
});
