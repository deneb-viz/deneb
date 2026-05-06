/**
 * Pure helpers for the Data tab. Exposes the reason-mapping at the
 * boundary so it can be unit-tested in a node environment.
 *
 * `VegaViewServices.getDataByName()` swallows internal errors and returns
 * `undefined` for both "dataset not registered" and "transform failure", so
 * the call-site cannot distinguish those two cases — they collapse into
 * `'dataset-unavailable'`. See `packages/vega-runtime/src/lib/view/service.ts`
 * for the upstream behaviour.
 */

import type { EmptyStateReason } from '../empty-state-reason';

/**
 * Map the Data tab's observable view state to an empty-state reason or
 * `null` if the table should render.
 *
 * Rules (evaluated in order; first match wins):
 * - `viewAvailable === false` → `'view-unavailable'` (no Vega view at all).
 * - view exists, but `availableDatasetCount === 0` → `'no-datasets'`. The
 *   view itself compiled, but exposes no addressable named datasets — e.g.
 *   a Vega-Lite spec with `layer: []` whose only data source is unreferenced
 *   and stripped during compilation. Distinct from `'dataset-unavailable'`
 *   because there is nothing for the user to switch to; the dropdown
 *   renders no options and is suppressed.
 * - view exists, has at least one addressable dataset, but either
 *   `datasetName` is empty or `datasetValues` is `undefined` →
 *   `'dataset-unavailable'` (the currently-selected name is not resolvable
 *   in the view, but the user could pick a different one).
 * - view exists, non-empty name, defined (even if `[]`) values → `null`
 *   (render the table; an empty array is a valid rendering of zero rows).
 */
export const resolveDataTabReason = (
    viewAvailable: boolean,
    availableDatasetCount: number,
    datasetName: string,
    datasetValues: unknown[] | undefined
): EmptyStateReason | null => {
    if (!viewAvailable) {
        return 'view-unavailable';
    }
    if (availableDatasetCount === 0) {
        return 'no-datasets';
    }
    if (datasetName === '' || datasetValues === undefined) {
        return 'dataset-unavailable';
    }
    return null;
};
