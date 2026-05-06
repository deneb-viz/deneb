import { describe, expect, it } from 'vitest';

import { resolveDataTabReason } from '../data-tab-utils';

/**
 * The Data tab's reason mapping has four outcomes: view-unavailable,
 * no-datasets, dataset-unavailable, and `null` (render the table).
 * `VegaViewServices.getDataByName()` swallows transform errors and returns
 * `undefined`, so the call-site cannot distinguish "not registered" from
 * "transform failure" — both land as `'dataset-unavailable'` by design.
 *
 * `'no-datasets'` is the case where the view itself compiled and is bound,
 * but exposes no addressable named datasets (e.g. an empty Vega-Lite
 * `layer: []` whose only data source was stripped during compilation).
 */
describe('resolveDataTabReason', () => {
    describe("'view-unavailable' wins regardless of dataset state", () => {
        it('view not available, with a name', () => {
            expect(resolveDataTabReason(false, 0, 'anything', undefined)).toBe(
                'view-unavailable'
            );
        });

        it('view not available, with an empty name', () => {
            expect(resolveDataTabReason(false, 0, '', undefined)).toBe(
                'view-unavailable'
            );
        });

        it('view not available, even when values are defined', () => {
            expect(
                resolveDataTabReason(false, 0, 'dataset', [{ a: 1 }])
            ).toBe('view-unavailable');
        });

        it("view not available wins over a non-zero dataset count (a stale or impossible mix shouldn't downgrade the reason)", () => {
            expect(resolveDataTabReason(false, 3, 'name', undefined)).toBe(
                'view-unavailable'
            );
        });
    });

    describe("'no-datasets' (view exists but exposes no addressable named datasets)", () => {
        it('view available, zero datasets, empty name → no-datasets', () => {
            expect(resolveDataTabReason(true, 0, '', undefined)).toBe(
                'no-datasets'
            );
        });

        it('view available, zero datasets, stale name → no-datasets (precedence over dataset-unavailable)', () => {
            expect(resolveDataTabReason(true, 0, 'stale', undefined)).toBe(
                'no-datasets'
            );
        });

        it('view available, zero datasets, even with defined values, still no-datasets (defensive — should not occur in practice)', () => {
            expect(resolveDataTabReason(true, 0, 'name', [{ a: 1 }])).toBe(
                'no-datasets'
            );
        });
    });

    describe("'dataset-unavailable' (view live + datasets present, but the chosen name does not resolve)", () => {
        it('view available, datasets present, name is empty', () => {
            expect(resolveDataTabReason(true, 1, '', undefined)).toBe(
                'dataset-unavailable'
            );
        });

        it('view available, datasets present, values are undefined', () => {
            expect(resolveDataTabReason(true, 2, 'name', undefined)).toBe(
                'dataset-unavailable'
            );
        });
    });

    describe('null (render the table)', () => {
        it('valid view + name + empty array (zero rows is still renderable)', () => {
            expect(resolveDataTabReason(true, 1, 'name', [])).toBeNull();
        });

        it('valid view + name + populated array', () => {
            expect(resolveDataTabReason(true, 1, 'name', [{ a: 1 }])).toBeNull();
        });

        it('valid view + name + multi-row array', () => {
            expect(
                resolveDataTabReason(true, 1, 'name', [
                    { a: 1 },
                    { a: 2 },
                    { a: 3 }
                ])
            ).toBeNull();
        });
    });
});
