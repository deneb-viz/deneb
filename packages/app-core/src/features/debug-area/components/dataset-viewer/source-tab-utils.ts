/**
 * Pure helpers for the Source tab. Extracted so the reason-mapping and
 * metadata-strip composition can be unit-tested in Vitest's node
 * environment without rendering React.
 *
 * See the implementation plan
 * (`docs/plans/2026-04-24-001-feat-data-viewer-source-tab-split-plan.md`)
 * Unit 5 for the rationale. `state.dataset.values` is always `VegaDatum[]`
 * (never undefined/null), and there is no "first update completed" flag in
 * the store today — so we follow the plan's Option B: collapse the
 * "loading" and "unavailable" cases into a single `'source-unavailable'`
 * reason and drop the `'source-loading'` emission for now.
 */

import { type VegaDatum } from '@deneb-viz/data-core/value';

import type { EmptyStateReason } from '../empty-state-reason';
import {
    detectSupportFields,
    getRowCount,
    type MetadataStripSpec
} from './source-and-data-tab-utils';

/**
 * Map the Source-tab's `state.dataset.values` to an empty-state reason. When
 * the dataset is populated, returns `null` — callers render the table.
 * Otherwise returns `'source-unavailable'`.
 *
 * Option B rationale (plan Unit 5): `state.dataset.values` always starts as
 * `[]` and is replaced by real rows after Power BI's first `update()`. No
 * flag distinguishes the pre-first-update case from a genuinely-empty
 * dataset, so we surface a single reason. A follow-up can introduce
 * `'source-loading'` once a first-update flag lands.
 */
export const resolveSourceTabReason = (
    values: VegaDatum[]
): EmptyStateReason | null => {
    if (!values || values.length === 0) {
        return 'source-unavailable';
    }
    return null;
};

/**
 * Compose the Source-tab metadata-strip spec. Row count is always present;
 * support-field names come from the first row (all rows share a shape).
 * Source tab never raises the error badge — that's a Data-tab concern.
 */
export const buildSourceMetadataSpec = (
    values: VegaDatum[]
): MetadataStripSpec => ({
    rowCount: getRowCount(values),
    supportFields: detectSupportFields(values[0]),
    errorBadge: false
});
