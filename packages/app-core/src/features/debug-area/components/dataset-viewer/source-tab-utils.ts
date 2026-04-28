/**
 * Pure helpers for the Source tab. Extracted so the reason-mapping can be
 * unit-tested in Vitest's node environment without rendering React.
 *
 * `state.dataset.values` is `VegaDatum[]` — there is no "first update
 * completed" flag in the store today, so empty and undefined collapse into
 * a single `'source-unavailable'` reason.
 */

import { type VegaDatum } from '@deneb-viz/data-core/value';

import type { EmptyStateReason } from '../empty-state-reason';

/**
 * Map the Source-tab's `state.dataset.values` to an empty-state reason. When
 * the dataset is populated, returns `null` — callers render the table.
 * Otherwise returns `'source-unavailable'`.
 */
export const resolveSourceTabReason = (
    values: VegaDatum[] | undefined
): EmptyStateReason | null => {
    if (!values || values.length === 0) {
        return 'source-unavailable';
    }
    return null;
};
