import powerbi from 'powerbi-visuals-api';

import { VisualFormattingSettingsModel } from '../persistence';

/**
 * Determines whether the visual can fetch more data, based on the feature switch and the corresponding flag in the store
 * (set by data processing methods).
 */
export const canFetchMoreFromDataview = (
    settings: VisualFormattingSettingsModel,
    metadata: powerbi.DataViewMetadata
): boolean => {
    return (
        (metadata?.segment && settings.dataLimit.loading.override.value) ||
        false
    );
};

/**
 * Process the data view values to determine if any of them have a highlights array.
 */
export const doesDataViewHaveHighlights = (
    values: powerbi.DataViewValueColumns
) => values?.filter((v) => v.highlights).length > 0;

/**
 * Gets the categorical data view from the visual update options.
 */
export const getCategoricalDataViewFromOptions = (
    options: powerbi.extensibility.visual.VisualUpdateOptions
) => options?.dataViews?.[0]?.categorical || {};

/**
 * Checks for valid `categorical` dataview and provides count of values.
 */
export const getCategoricalRowCount = (
    categorical: powerbi.DataViewCategorical
) =>
    categorical?.categories?.[0]?.values?.length ||
    categorical?.values?.[0]?.values?.length ||
    0;

/**
 * Decision returned by {@link resolveDatasetUpdateAction}: what the
 * visual should do with the current update.
 *
 * - `fetch-more`: data changed and more segments are advertised — start
 *   (or continue) Power BI's segmented `fetchMoreData` chain.
 * - `finalise`:
 *   - `reason: 'normal'` — standard terminal segment. The orchestrator
 *     clears the fetching flag AND calls `setDataset` with the current
 *     categorical.
 *   - `reason: 'recover-interrupted-fetch'` — recovery after a
 *     non-volatile update (viewer↔editor / focus-mode transition)
 *     interrupted an in-progress segmented fetch. The orchestrator
 *     clears the fetching flag ONLY — it does NOT call `setDataset`.
 *     Power BI may re-send a reduced categorical during transitions
 *     (e.g. editor mode resets segmented-fetch state and ships only
 *     the initial window); calling `setDataset(getMappedDataset(...))`
 *     here would overwrite a fully-loaded dataset with that reduced
 *     payload and silently lose rows. The existing dataset slice is
 *     preserved; subsequent property persists, cross-filter events, or
 *     real data changes re-enter the normal change-detection path on
 *     their own.
 * - `skip`: nothing relevant has changed, nothing to do.
 */
export type DatasetUpdateAction =
    | { kind: 'fetch-more' }
    | { kind: 'finalise'; reason: 'normal' | 'recover-interrupted-fetch' }
    | { kind: 'skip' };

/**
 * Pure decision behind `Deneb.resolveDataset`. Centralising the branch
 * logic keeps the side-effecting orchestrator small and lets the
 * behaviour around interrupted segmented fetches be unit-tested
 * without standing up the visual harness.
 *
 * The decision function itself does not know about the differing
 * side-effects each `finalise` reason triggers; that's the
 * orchestrator's responsibility. See the `DatasetUpdateAction` JSDoc
 * for the side-effect contract per reason, and `Deneb.resolveDataset`
 * for the dispatch.
 *
 * `isInitialSegment` reflects `options.operationKind === Create` —
 * Power BI's signal that this is the start of a (new) segmented fetch
 * chain. When combined with `isFetchingAdditional: true`, it means the
 * host has restarted the fetch chain while a previous one was still
 * in progress. We treat this as recovery rather than starting another
 * fetch loop — repeatedly calling `fetchMoreData(true)` in this
 * situation reliably gets stuck (the host accepts the call but
 * sometimes never delivers the Append), and the previous chain's
 * dataset is the safer surface to preserve. Documented trade-off: a
 * legitimate user filter applied mid-fetch (rare) produces the same
 * `Create + isFetchingAdditional` signal and would be discarded by
 * this guard.
 */
export const resolveDatasetUpdateAction = (input: {
    dataChanged: boolean;
    canFetchMore: boolean;
    isFetchingAdditional: boolean;
    isInitialSegment: boolean;
}): DatasetUpdateAction => {
    const {
        dataChanged,
        canFetchMore,
        isFetchingAdditional,
        isInitialSegment
    } = input;
    // Host-restart guard. Power BI sometimes sends a fresh Create
    // while our previous fetch chain hasn't been finalised — opening
    // the editor a second time on a fully-loaded multi-segment
    // dataset is the observed trigger. Without this guard we enter
    // fetch-more again, the host accepts but doesn't deliver, and the
    // visual sits on the loading screen until manually nudged. The
    // recovery branch clears the stuck flag and preserves the
    // previously-loaded dataset.
    if (isInitialSegment && isFetchingAdditional) {
        return { kind: 'finalise', reason: 'recover-interrupted-fetch' };
    }
    if (dataChanged && canFetchMore) return { kind: 'fetch-more' };
    if (dataChanged) return { kind: 'finalise', reason: 'normal' };
    if (isFetchingAdditional)
        return { kind: 'finalise', reason: 'recover-interrupted-fetch' };
    return { kind: 'skip' };
};
