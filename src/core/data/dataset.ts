import powerbi from 'powerbi-visuals-api';
import DataViewCategorical = powerbi.DataViewCategorical;
import ISelectionId = powerbi.visuals.ISelectionId;
import PrimitiveValue = powerbi.PrimitiveValue;

import range from 'lodash/range';
import reduce from 'lodash/reduce';

import { createSelectionIds } from '../../features/interactivity';
import {
    isDrilldownFeatureEnabled,
    resolveDrilldownComponents,
    resolveDrilldownFlat
} from '../../features/dataset';
import {
    type AugmentedMetadataField,
    DRILL_FIELD_FLAT,
    DRILL_FIELD_NAME,
    getCastedPrimitiveValue,
    getHighlightComparatorValue,
    getHighlightStatusValue,
    HIGHLIGHT_COMPARATOR_SUFFIX,
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX
} from '@deneb-viz/dataset/field';
import {
    DATASET_DEFAULT_NAME,
    getEmptyDataset,
    type IDataset
} from '@deneb-viz/dataset/data';
import { getDatasetFieldsInclusive } from '@deneb-viz/dataset/field';
import {
    getDatumFieldMetadataFromDataView,
    getDatumFieldsFromMetadata,
    getDatumValueEntriesFromDataview,
    getEncodedFieldName,
    type DatasetValueRow
} from '@deneb-viz/dataset/datum';
import { getHashValue } from '@deneb-viz/utils/crypto';
import {
    getDataPointCrossFilterStatus,
    isCrossFilterPropSet,
    isCrossHighlightPropSet
} from '@deneb-viz/powerbi-compat/interactivity';
import {
    doesDataViewHaveHighlights,
    getCategoricalRowCount,
    getVisualSelectionManager
} from '@deneb-viz/powerbi-compat/visual-host';
import { logError, logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';

/**
 * For supplied data view field metadata, produce a suitable object
 * representation of the row that corresponds with the dataset metadata.
 */
const getDataRow = (
    fields: AugmentedMetadataField[],
    values: PrimitiveValue[][],
    rowIndex: number,
    hasHighlights: boolean,
    hasDrilldown: boolean,
    enableHighlight: boolean
) => {
    const isCrossHighlight = isCrossHighlightPropSet({
        enableHighlight
    });
    return reduce(
        fields,
        (row, f, fi) => {
            const rawValue = getCastedPrimitiveValue(f, values[fi][rowIndex]);
            const fieldName = getEncodedFieldName(f.column.displayName);
            const isDataset = f?.column.roles?.[DATASET_DEFAULT_NAME];
            const isDrilldown =
                hasDrilldown && f?.column?.roles?.[DRILL_FIELD_NAME];
            if (isDataset) {
                const fieldHighlight = `${fieldName}${HIGHLIGHT_FIELD_SUFFIX}`;
                const fieldHighlightStatus = `${fieldName}${HIGHLIGHT_STATUS_SUFFIX}`;
                const fieldHighlightComparator = `${fieldName}${HIGHLIGHT_COMPARATOR_SUFFIX}`;
                const rawValueOriginal: PrimitiveValue = row[fieldHighlight];
                const shouldHighlight =
                    isCrossHighlight && f.source === 'values';
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
            if (isDrilldown) {
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
            return row;
        },
        <DatasetValueRow>{}
    );
};

/**
 * Processes the data in the visual's data view into an object suitable for the
 * visual's API.
 */
export const getMappedDataset = (
    categorical: DataViewCategorical,
    enableSelection: boolean,
    enableHighlight: boolean
): IDataset => {
    const rowsLoaded = getCategoricalRowCount(categorical);
    const empty = getEmptyDataset();
    const dvCategories = categorical?.categories;
    const dvValues = categorical?.values;
    const hasDataView = (dvCategories || dvValues) && true;
    if (!hasDataView) {
        return empty;
    } else {
        try {
            logTimeStart('getMappedDataset');
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
                enableHighlight
            );
            const selections: ISelectionId[] = <ISelectionId[]>(
                getVisualSelectionManager().getSelectionIds()
            );
            const fields = getDatumFieldsFromMetadata(columns);
            /**
             * #357, #396 the selection IDs massively degrade performance when
             * hashing, so we has a copy of the values without the selection
             * IDs present.
             */
            logTimeStart('getMappedDataset hashValue');
            const hashValue = getHashValue({
                fields,
                fieldValues,
                isCrossFilter
            });
            logTimeEnd('getMappedDataset hashValue');
            logTimeStart('getMappedDataset values');
            const selectionFields = getDatasetFieldsInclusive(fields);
            const values: DatasetValueRow[] = range(rowsLoaded).map((r, ri) => {
                const md = getDataRow(
                    columns,
                    fieldValues,
                    ri,
                    hasHighlights,
                    hasDrilldown,
                    enableHighlight
                );
                const identity = createSelectionIds(
                    selectionFields,
                    dvCategories,
                    [r]
                )[0];
                return {
                    ...{
                        __row__: r,
                        __identity__: identity,
                        __key__: getSidString(identity)
                    },
                    ...(isCrossFilter && {
                        __selected__: getDataPointCrossFilterStatus(
                            identity,
                            selections
                        )
                    }),
                    ...md
                };
            });
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

/**
 * We have some compatibility issues between `powerbi.extensibility.ISelectionId`
 * and `powerbi.visuals.ISelectionId`, as well as needing to coerce Selection
 * IDs to strings so that we can set initial selections for Vega-Lite (as objects
 * aren't supported). This consolidates the logic we're using to resolve a
 * Selection ID to a string representation suitable for use across the visual.
 */
const getSidString = (id: ISelectionId) => JSON.stringify(id.getSelector());
