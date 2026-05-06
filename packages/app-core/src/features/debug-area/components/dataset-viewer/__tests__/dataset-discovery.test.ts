import { describe, expect, it } from 'vitest';

import { filterDatasetNames } from '../dataset-discovery';

/**
 * `filterDatasetNames` is the pure half of `getAvailableDatasetNames()` —
 * extracted so the filter contract is testable without mocking the frozen
 * `VegaViewServices` singleton. The runtime version layers Vega's
 * `getAllData()` lookup on top; the filter is the regression path for the
 * empty-layer / phantom-dataset bug, so it is the load-bearing thing to
 * pin down with tests.
 */
describe('filterDatasetNames', () => {
    it("returns [] when the view exposes only Vega's internal 'root' (the empty-layer regression case)", () => {
        expect(filterDatasetNames({ root: [] })).toEqual([]);
    });

    it('returns [] for a completely empty map (no view bound / getAllData errored to {})', () => {
        expect(filterDatasetNames({})).toEqual([]);
    });

    it("returns the user-facing names when 'root' coexists with addressable datasets", () => {
        const result = filterDatasetNames({
            root: [],
            sales: [{ a: 1 }],
            inventory: [{ b: 2 }]
        });
        expect(result).toEqual(['sales', 'inventory']);
    });

    it("does NOT exclude names that merely contain 'root' as a substring (e.g. 'root_copy', 'rooted')", () => {
        const result = filterDatasetNames({
            root: [],
            root_copy: [],
            rooted: [],
            uproot: []
        });
        expect(result).toEqual(['root_copy', 'rooted', 'uproot']);
    });

    it('preserves insertion order of remaining keys (callers rely on this for the dropdown default)', () => {
        const result = filterDatasetNames({
            zeta: [],
            root: [],
            alpha: [],
            beta: []
        });
        expect(result).toEqual(['zeta', 'alpha', 'beta']);
    });
});
