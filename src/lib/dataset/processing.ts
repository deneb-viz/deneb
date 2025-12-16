import powerbi from 'powerbi-visuals-api';
import DataViewCategorical = powerbi.DataViewCategorical;
import PrimitiveValue = powerbi.PrimitiveValue;

import {
    isDrilldownFeatureEnabled,
    resolveDrilldownComponents,
    resolveDrilldownFlat
} from './drilldown';
import {
    type AugmentedMetadataField,
    DRILL_FIELD_FLAT,
    DRILL_FIELD_NAME,
    getCastedPrimitiveValue,
    getHighlightComparatorValue,
    getHighlightStatusValue,
    HIGHLIGHT_COMPARATOR_SUFFIX,
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX,
    DATASET_DEFAULT_NAME,
    getEmptyDataset,
    type IDataset,
    getDatumFieldMetadataFromDataView,
    getDatumFieldsFromMetadata,
    getDatumValueEntriesFromDataview,
    getEncodedFieldName,
    type DatasetValueRow
} from '@deneb-viz/powerbi-compat/dataset';
import {
    InteractivityManager,
    isCrossFilterPropSet,
    isCrossHighlightPropSet,
    type SelectionIdQueueEntry,
    type SelectionIdQueue
} from '@deneb-viz/powerbi-compat/interactivity';
import {
    doesDataViewHaveHighlights,
    getCategoricalRowCount
} from '@deneb-viz/powerbi-compat/visual-host';
import { logError, logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';

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
    const row = <DatasetValueRow>{};
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
 * Processes the data in the visual's data view into an object suitable for the visual's API.
 */
export const getMappedDataset = (
    categorical: DataViewCategorical,
    locale: string,
    enableSelection: boolean,
    enableHighlight: boolean
): IDataset => {
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
            const isCrossHighlight = isCrossHighlightPropSet({
                enableHighlight
            });
            const isCrossFilter = isCrossFilterPropSet({ enableSelection });
            const hasHighlights = doesDataViewHaveHighlights(dvValues);
            const columns = getDatumFieldMetadataFromDataView(
                dvCategories,
                dvValues,
                enableHighlight
            );
            const hasDrilldown =
                isDrilldownFeatureEnabled() &&
                columns.filter((c) => c.column.roles?.[DRILL_FIELD_NAME])
                    ?.length > 0;
            const fieldValues = getDatumValueEntriesFromDataview(
                dvCategories,
                dvValues,
                locale,
                enableHighlight
            );
            const fields = getDatumFieldsFromMetadata(columns);
            /**
             * Fast change detection: instead of hashing all values, create a lightweight fingerprint from row count,
             * field names, and first/last row samples.
             * This is orders of magnitude faster than SHA1 hashing for large datasets.
             */
            // TODO: see how we go before this is 'done'.
            logTimeStart('getMappedDataset hashValue');
            const fieldNames = Object.keys(fields).sort().join(',');
            const hashValue = `${rowsLoaded}:${fieldNames}:${
                fieldValues.length > 0
                    ? `${fieldValues[0]?.[0]}-${fieldValues[0]?.[rowsLoaded - 1]}`
                    : ''
            }:${isCrossFilter}`;
            logTimeEnd('getMappedDataset hashValue');
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
                            queryName: f.queryName
                        });
                    } else {
                        selectionQueueBase.push({
                            type: 'category',
                            column: dvCategories[f.sourceIndex]
                        });
                    }
                }
            }
            const selectionQueue: SelectionIdQueue = {
                entries: selectionQueueBase,
                rowNumber: 0
            };

            const values: DatasetValueRow[] = [];
            for (let r = 0; r < rowsLoaded; r++) {
                selectionQueue.rowNumber = r;
                const selector =
                    InteractivityManager.addRowSelector(selectionQueue);
                const md: DatasetValueRow = {
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
                hashValue,
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
