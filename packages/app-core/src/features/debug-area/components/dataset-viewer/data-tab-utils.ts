/**
 * Pure helpers for the Data tab. Exposes the reason-mapping at the
 * boundary so it can be unit-tested in a node environment.
 *
 * The Data tab's empty-state reasons are two-way, not three:
 * `VegaViewServices.getDataByName()` swallows internal errors and returns
 * `undefined` for both "dataset not registered" and "transform failure", so
 * the call-site can only distinguish "no view" from "no dataset in the
 * view". See `packages/vega-runtime/src/lib/view/service.ts` for the
 * upstream behaviour.
 */

import type { EmptyStateReason } from '../empty-state-reason';

/**
 * Map the Data tab's observable view state to an empty-state reason or
 * `null` if the table should render.
 *
 * Rules:
 * - `viewAvailable === false` → `'view-unavailable'` (no Vega view at all).
 * - view exists, but either `datasetName` is empty or
 *   `datasetValues` is `undefined` → `'dataset-unavailable'` (the named
 *   dataset is not resolvable in the current view).
 * - view exists, non-empty name, defined (even if `[]`) values → `null`
 *   (render the table; an empty array is a valid rendering of zero rows).
 */
export const resolveDataTabReason = (
    viewAvailable: boolean,
    datasetName: string,
    datasetValues: unknown[] | undefined
): EmptyStateReason | null => {
    if (!viewAvailable) {
        return 'view-unavailable';
    }
    if (datasetName === '' || datasetValues === undefined) {
        return 'dataset-unavailable';
    }
    return null;
};
