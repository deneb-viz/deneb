import powerbi from 'powerbi-visuals-api';
import DataViewCategorical = powerbi.DataViewCategorical;
import DataViewValueColumns = powerbi.DataViewValueColumns;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import PrimitiveValue = powerbi.PrimitiveValue;
import { mergician } from 'mergician';

import {
    isDrilldownFeatureEnabled,
    resolveDrilldownComponents,
    resolveDrilldownFlat
} from './drilldown';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import {
    DRILL_FIELD_FLAT,
    DRILL_FIELD_NAME,
    HIGHLIGHT_COMPARATOR_SUFFIX,
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX,
    ROW_INDEX_FIELD_NAME
} from '@deneb-viz/data-core/field';
import {
    getHighlightComparatorValue,
    getHighlightStatusValue,
    type VegaDatum
} from '@deneb-viz/data-core/value';
import {
    logDebug,
    logError,
    logTimeEnd,
    logTimeStart
} from '@deneb-viz/utils/logging';
import { type DatasetSlice, type SetDatasetPayload } from '../../state/dataset';
import {
    doesDataViewHaveHighlights,
    getCategoricalRowCount
} from './data-view';
import type { AugmentedMetadataField } from './types';
import {
    getCastedPrimitiveValue,
    getDatumValueEntriesFromDataview
} from './values';
import {
    getDatumFieldMetadataFromDataView,
    getDatumFieldsFromMetadata,
    getEncodedFieldName
} from './fields';
import {
    InteractivityManager,
    isCrossFilterPropSet,
    isCrossHighlightPropSet,
    type SelectionIdQueue,
    type SelectionIdQueueEntry,
    type SelectorStatus
} from '../interactivity';

// State for reference-based change detection
let prevCategories: DataViewCategoryColumn[] | undefined;
let prevValues: DataViewValueColumns | undefined;
let prevHighlights: (PrimitiveValue[] | undefined)[] = [];
let prevEnableSelection: boolean | undefined;
let prevEnableHighlight: boolean | undefined;
let prevRowCount: number = 0;

/**
 * For supplied data view field metadata, produce a suitable object representation of the row that corresponds with the
 * dataset metadata.
 */
const getDataRow = (
    fields: AugmentedMetadataField[],
    values: PrimitiveValue[][],
    rowIndex: number,
    hasHighlights: boolean,
    hasDrilldown: boolean,
    isCrossHighlight: boolean
) => {
    const row = <VegaDatum>{};
    for (let fi = 0; fi < fields.length; fi++) {
        const f = fields[fi];
        const rawValue = getCastedPrimitiveValue(f, values[fi][rowIndex]);
        const fieldName =
            f.encodedName ?? getEncodedFieldName(f.column.displayName);
        const isDatasetField = f?.column.roles?.[DATASET_DEFAULT_NAME];
        const isDrilldownField =
            hasDrilldown && f?.column?.roles?.[DRILL_FIELD_NAME];

        if (isDatasetField) {
            const fieldHighlight = `${fieldName}${HIGHLIGHT_FIELD_SUFFIX}`;
            const fieldHighlightStatus = `${fieldName}${HIGHLIGHT_STATUS_SUFFIX}`;
            const fieldHighlightComparator = `${fieldName}${HIGHLIGHT_COMPARATOR_SUFFIX}`;
            const rawValueOriginal: PrimitiveValue = row[fieldHighlight];
            const shouldHighlight = isCrossHighlight && f.source === 'values';

            row[fieldName] = rawValue;
            if (shouldHighlight) {
                row[fieldHighlightStatus] = getHighlightStatusValue(
                    hasHighlights,
                    rawValue,
                    rawValueOriginal
                );
                row[fieldHighlightComparator] = getHighlightComparatorValue(
                    rawValue,
                    rawValueOriginal
                );
            }
        }

        if (isDrilldownField) {
            row[DRILL_FIELD_NAME] = resolveDrilldownComponents(
                row?.[DRILL_FIELD_NAME],
                rawValue,
                f.column.format
            );
            row[DRILL_FIELD_FLAT] = resolveDrilldownFlat(
                row?.[DRILL_FIELD_FLAT],
                rawValue,
                f.column.format
            );
        }
    }
    return row;
};

/**
 * Ensures an empty dataset is made available.
 */
const getEmptyDataset = (): SetDatasetPayload => ({
    fields: {},
    values: [],
    hasDrilldown: false,
    hasHighlights: false,
    rowsLoaded: 0
});

/**
 * Fast reference-based change detection for data views.
 * Checks if array references have changed rather than deep comparing values.
 * O(columns) complexity instead of O(rows × columns).
 */
export const hasDataViewChanged = (
    categorical: DataViewCategorical | undefined,
    enableSelection: boolean,
    enableHighlight: boolean
): boolean => {
    logTimeStart('hasDataViewChanged');

    // Settings changed
    if (
        enableSelection !== prevEnableSelection ||
        enableHighlight !== prevEnableHighlight
    ) {
        prevEnableSelection = enableSelection;
        prevEnableHighlight = enableHighlight;
        updatePrevReferences(categorical);
        logDebug(
            'hasDataViewChanged: enableSelection or enableHighlight changed'
        );
        logTimeEnd('hasDataViewChanged');
        return true;
    }

    const categories = categorical?.categories;
    const values = categorical?.values;

    // Reference check on categories array
    if (categories !== prevCategories) {
        updatePrevReferences(categorical);
        logDebug('hasDataViewChanged: categories reference changed');
        logTimeEnd('hasDataViewChanged');
        return true;
    }

    // Reference check on values array
    if (values !== prevValues) {
        updatePrevReferences(categorical);
        logDebug('hasDataViewChanged: values reference changed');
        logTimeEnd('hasDataViewChanged');
        return true;
    }

    // Check row count as fallback (in case references are reused but data grows)
    const rowCount =
        categories?.[0]?.values?.length ?? values?.[0]?.values?.length ?? 0;
    if (rowCount !== prevRowCount) {
        updatePrevReferences(categorical);
        logDebug('hasDataViewChanged: row count changed', {
            prevRowCount,
            rowCount
        });
        logTimeEnd('hasDataViewChanged');
        return true;
    }

    // Reference check on each highlights array (for cross-highlighting)
    if (values) {
        for (let i = 0; i < values.length; i++) {
            if (values[i].highlights !== prevHighlights[i]) {
                updatePrevReferences(categorical);
                logDebug(
                    'hasDataViewChanged: highlights reference changed at index',
                    { index: i }
                );
                logTimeEnd('hasDataViewChanged');
                return true;
            }
        }
    }

    logDebug('hasDataViewChanged: no change detected');
    logTimeEnd('hasDataViewChanged');
    return false;
};

/**
 * Updates the previous reference state for subsequent comparisons.
 */
const updatePrevReferences = (
    categorical: DataViewCategorical | undefined
): void => {
    prevCategories = categorical?.categories;
    prevValues = categorical?.values;
    prevHighlights = categorical?.values?.map((v) => v.highlights) ?? [];
    prevRowCount =
        categorical?.categories?.[0]?.values?.length ??
        categorical?.values?.[0]?.values?.length ??
        0;
};

/**
 * Processes the data in the visual's data view into an object suitable for the visual's API.
 */
export const getMappedDataset = (
    categorical: DataViewCategorical,
    locale: string
): SetDatasetPayload => {
    const rowsLoaded = getCategoricalRowCount(categorical);
    const empty = getEmptyDataset();
    InteractivityManager.clearSelectors();
    const dvCategories = categorical?.categories;
    const dvValues = categorical?.values;
    const hasDataView = (dvCategories || dvValues) && true;
    if (!hasDataView) {
        return empty;
    } else {
        try {
            logTimeStart('getMappedDataset');
            const isCrossHighlight = isCrossHighlightPropSet();
            const isCrossFilter = isCrossFilterPropSet();
            const hasHighlights = doesDataViewHaveHighlights(dvValues);
            const columns = getDatumFieldMetadataFromDataView(
                dvCategories,
                dvValues
            );
            const hasDrilldown =
                isDrilldownFeatureEnabled() &&
                columns.filter((c) => c.column.roles?.[DRILL_FIELD_NAME])
                    ?.length > 0;
            const fieldValues = getDatumValueEntriesFromDataview(
                dvCategories,
                dvValues,
                locale
            );
            const fields = getDatumFieldsFromMetadata(columns);

            logTimeStart('getMappedDataset values');

            // Build selection queue template once (outside the row loop)
            // Doing this here this adds up a lot when processing large datasets
            const selectionQueueBase: SelectionIdQueueEntry[] = [];
            for (const key in fields) {
                const f = fields[key];
                if (f && !f.isExcludedFromTemplate) {
                    if (f.isMeasure) {
                        selectionQueueBase.push({
                            type: 'measure',
                            queryName: f.id
                        });
                    } else {
                        selectionQueueBase.push({
                            type: 'category',
                            column: dvCategories[f.hostMetadata?.sourceIndex]
                        });
                    }
                }
            }
            const selectionQueue: SelectionIdQueue = {
                entries: selectionQueueBase,
                rowNumber: 0
            };

            const values: VegaDatum[] = [];
            for (let r = 0; r < rowsLoaded; r++) {
                selectionQueue.rowNumber = r;
                const selector =
                    InteractivityManager.addRowSelector(selectionQueue);
                const md: VegaDatum = {
                    __row__: r,
                    ...(isCrossFilter && { __selected__: selector?.status }),
                    ...getDataRow(
                        columns,
                        fieldValues,
                        r,
                        hasHighlights,
                        hasDrilldown,
                        isCrossHighlight
                    )
                };
                values.push(md);
            }
            logTimeEnd('getMappedDataset values');
            logTimeEnd('getMappedDataset');
            return {
                hasDrilldown,
                hasHighlights,
                fields,
                values,
                rowsLoaded
            };
        } catch (e) {
            logError('getMappedDataset failure', e);
            return empty;
        }
    }
};

/**
 * Updates the dataset to reflect the current selection states from the selector map.
 */
export const getUpdatedDatasetSelectors = (
    dataset: DatasetSlice,
    selectorMap: SelectorStatus,
    enableSelection: boolean
) => {
    logTimeStart('dataset.updateDatasetSelectors');
    const isCrossFilter = isCrossFilterPropSet();
    let hasSelectionChanged = false;
    const values: VegaDatum[] = [];
    const nValues = dataset.values.length;
    if (isCrossFilter) {
        for (let i = 0; i < nValues; i++) {
            const v = dataset.values[i];
            const currentState =
                selectorMap.get(v[ROW_INDEX_FIELD_NAME]) ?? 'neutral';
            if (v.__selected__ !== currentState) {
                logDebug(
                    'dataset.updateDatasetSelectors: selection state changed',
                    {
                        rowIndex: v[ROW_INDEX_FIELD_NAME],
                        previous: v.__selected__,
                        current: currentState
                    }
                );
                hasSelectionChanged = true;
            }
            values.push({
                ...v,
                __selected__: currentState
            });
        }
    } else {
        for (let i = 0; i < nValues; i++) {
            values.push(dataset.values[i]);
        }
    }
    const newDataset = mergician(dataset, { values }) as DatasetSlice;
    // Only update version if selection state has changed, as this is the only volatile change
    newDataset.version = hasSelectionChanged
        ? dataset.version + 1
        : dataset.version;
    logDebug('dataset.updateDatasetSelectors', {
        newDataset,
        hasSelectionChanged
    });
    logTimeEnd('dataset.updateDatasetSelectors');
    return newDataset;
};
