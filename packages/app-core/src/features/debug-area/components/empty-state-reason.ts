/**
 * Discriminates the empty-state condition a debug-area viewer is in so
 * `NoDataMessage` can render copy that matches the actual cause. Shared by
 * the dataset-viewer tabs (Source + Data) and the signal viewer; co-located
 * with `no-data-message.tsx` rather than scoped under `dataset-viewer/` so
 * the signal viewer isn't forced to import from a sibling feature folder.
 *
 * - `source-unavailable`   — Source tab: dataset is empty or undefined. The
 *                            store has no first-update flag, so loading and
 *                            empty collapse into this single reason.
 * - `view-unavailable`     — Data tab / Signal viewer: `VegaViewServices.getView()` is null.
 * - `no-datasets`          — Data tab: view exists but exposes no addressable named datasets
 *                            (e.g. a Vega-Lite spec with `layer: []` whose only data source
 *                            is unreferenced and stripped during compilation). Distinct from
 *                            `dataset-unavailable` because there is nothing for the user to
 *                            pick from — the dropdown renders no options and is suppressed.
 * - `dataset-unavailable`  — Data tab: view exists, has at least one addressable dataset, but
 *                            the currently-selected name resolves to undefined (getDataByName
 *                            swallows transform errors, so "not registered" and "transform
 *                            failure" collapse into this one reason at the call site).
 * - `no-signals`           — Signal viewer: view exists but has no signals.
 */
export type EmptyStateReason =
    | 'source-unavailable'
    | 'view-unavailable'
    | 'no-datasets'
    | 'dataset-unavailable'
    | 'no-signals';
