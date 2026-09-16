import { logDebug } from '@deneb-viz/utils/logging';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';

/**
 * The implicit root dataset that Vega creates internally; not an addressable
 * named source. Filtered out everywhere we surface dataset names to the user.
 */
const DEBUG_ROOT_DATASET_NAME = 'root';

/**
 * Filters Vega's internal `'root'` dataset out of an arbitrary keyed map.
 * Pure helper extracted from `getAvailableDatasetNames()` so the filter
 * contract — the regression path for the empty-layer / phantom-dataset bug
 * fixed by this module — is unit-testable without mocking the frozen
 * `VegaViewServices` singleton.
 */
export const filterDatasetNames = (
    allData: Record<string, unknown>
): string[] =>
    Object.keys(allData).filter((key) => key !== DEBUG_ROOT_DATASET_NAME);

/**
 * Returns the names of datasets registered in the current Vega view,
 * excluding Vega's internal `'root'` dataset. Returns `[]` when no view is
 * bound or when the view exposes no addressable named datasets — e.g. a
 * Vega-Lite spec with `layer: []` whose only data source is unreferenced and
 * stripped during compilation.
 *
 * No fabricated default is injected. Callers that need to render an
 * empty-state branch own that decision (see the `'no-datasets'`
 * `EmptyStateReason` and the Data tab's reason resolver).
 */
export const getAvailableDatasetNames = (): string[] => {
    const allData = VegaViewServices.getAllData();
    const datasets = filterDatasetNames(allData);
    logDebug('getAvailableDatasetNames', {
        allDataKeys: Object.keys(allData),
        datasets
    });
    return datasets;
};
