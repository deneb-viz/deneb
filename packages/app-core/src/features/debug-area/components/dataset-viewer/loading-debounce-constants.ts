/**
 * Threshold for debouncing the `processing` term in the early-return loading
 * guards of `source-tab.tsx` and `data-tab.tsx`. Eliminates visible flicker
 * when fast worker round-trips (sort, page, cross-filter, debounced compile)
 * would otherwise momentarily replace a populated table with
 * `<ProcessingDataMessage />` and immediately restore it.
 *
 * Trailing-edge semantics via `useDebounce` from `@uidotdev/usehooks`: the
 * spinner only appears when `processing` has been continuously `true` for
 * this many milliseconds. Rapid `false → true → false` cycles within the
 * window coalesce.
 *
 * Note: only the `processing` term is debounced. The "no rows yet" term in
 * each tab's guard (`!tableState.rows` / `!datasetState.values?.length`) is
 * NOT debounced, so first-load shows the spinner immediately.
 *
 * 150ms baseline; revisit post-ship if empirical worker round-trip on a
 * 500-1000 row dataset suggests a different value (per plan Unit 3, Step 1).
 */
export const LOADING_INDICATOR_DEBOUNCE_MS = 150;
