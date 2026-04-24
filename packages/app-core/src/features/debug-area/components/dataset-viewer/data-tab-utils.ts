/**
 * Pure helpers for the Data tab. Mirrors the shape of `source-tab-utils.ts`
 * so both tabs share the `MetadataStripSpec` contract and expose their
 * reason-mapping at the boundary.
 *
 * The Data tab's empty-state reasons are two-way, not three:
 * `VegaViewServices.getDataByName()` swallows internal errors and returns
 * `undefined` for both "dataset not registered" and "transform failure", so
 * the call-site can only distinguish "no view" from "no dataset in the
 * view". See the plan (Unit 6) and
 * `packages/vega-runtime/src/lib/view/service.ts` for the upstream
 * behaviour.
 */

import type { EmptyStateReason } from '../empty-state-reason';
import {
    getRowCount,
    type MetadataStripSpec
} from './source-and-data-tab-utils';

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

/**
 * Compose the Data-tab metadata-strip spec. Per R9, the Data tab's
 * metadata strip shows row count + an error badge when the current state
 * resolves to an empty-state reason. Support-field badges are a Source-tab
 * concern and are omitted here.
 */
export const buildDataMetadataSpec = (
    values: unknown[] | undefined,
    hasError: boolean
): MetadataStripSpec => ({
    rowCount: getRowCount(values),
    errorBadge: hasError
});
