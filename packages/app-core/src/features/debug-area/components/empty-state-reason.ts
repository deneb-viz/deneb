/**
 * Discriminates the empty-state condition a debug-area viewer is in so
 * `NoDataMessage` can render copy that matches the actual cause. Shared by
 * the dataset-viewer tabs (Source + Data) and the signal viewer; co-located
 * with `no-data-message.tsx` rather than scoped under `dataset-viewer/` so
 * the signal viewer isn't forced to import from a sibling feature folder.
 *
 * - `source-loading`       — Source tab pre-first-update (dataset undefined).
 * - `source-unavailable`   — Source tab post-load empty (dataset is []).
 * - `view-unavailable`     — Data tab / Signal viewer: `VegaViewServices.getView()` is null.
 * - `dataset-unavailable`  — Data tab: view exists but the named dataset resolves to undefined
 *                            (getDataByName swallows transform errors, so "not registered" and
 *                            "transform failure" collapse into this one reason at the call site).
 * - `no-signals`           — Signal viewer: view exists but has no signals.
 */
export type EmptyStateReason =
    | 'source-loading'
    | 'source-unavailable'
    | 'view-unavailable'
    | 'dataset-unavailable'
    | 'no-signals';
