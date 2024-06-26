import powerbi from 'powerbi-visuals-api';
import DataViewCategorical = powerbi.DataViewCategorical;
import ISelectionId = powerbi.visuals.ISelectionId;
import PrimitiveValue = powerbi.PrimitiveValue;

import range from 'lodash/range';
import reduce from 'lodash/reduce';

import { IAugmentedMetadataField, IVisualDatasetValueRow } from '.';
import {
    castPrimitiveValue,
    getHighlightStatus,
    getRowCount,
    resolveHighlightComparator,
    resolveHighlightStatus
} from './dataView';
import {
    getDatasetFieldEntries,
    getDatasetFields,
    getEncodedFieldName
} from './fields';
import { getDatasetValueEntries } from './values';
import {
    createSelectionIds,
    getDataPointCrossFilterStatus,
    isCrossFilterPropSet,
    isCrossHighlightPropSet
} from '../../features/interactivity';
import { getState } from '../../store';
import {
    DATASET_NAME,
    DATASET_ROLE_DRILLDOWN,
    DATASET_ROLE_DRILLDOWN_FLAT,
    HIGHLIGHT_COMPARATOR_SUFFIX,
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX
} from '../../constants';
import {
    isDrilldownFeatureEnabled,
    resolveDrilldownComponents,
    resolveDrilldownFlat
} from '../../features/dataset';
import { logError, logTimeEnd, logTimeStart } from '../../features/logging';
import { getHashValue } from '../../utils';
import { getVisualSelectionManager } from '../../features/visual-host';
import {
    IDataset,
    getDatasetFieldsInclusive
} from '@deneb-viz/core-dependencies';

/**
 * For supplied data view field metadata, produce a suitable object
 * representation of the row that corresponds with the dataset metadata.
 */
const getDataRow = (
    fields: IAugmentedMetadataField[],
    values: PrimitiveValue[][],
    rowIndex: number,
    hasHighlights: boolean,
    hasDrilldown: boolean
) => {
    const isCrossHighlight = isCrossHighlightPropSet();
    return reduce(
        fields,
        (row, f, fi) => {
            const rawValue = castPrimitiveValue(f, values[fi][rowIndex]);
            const fieldName = getEncodedFieldName(f.column.displayName);
            const isDataset = f?.column.roles?.[DATASET_NAME];
            const isDrilldown =
                hasDrilldown && f?.column?.roles?.[DATASET_ROLE_DRILLDOWN];
            if (isDataset) {
                const fieldHighlight = `${fieldName}${HIGHLIGHT_FIELD_SUFFIX}`;
                const fieldHighlightStatus = `${fieldName}${HIGHLIGHT_STATUS_SUFFIX}`;
                const fieldHighlightComparator = `${fieldName}${HIGHLIGHT_COMPARATOR_SUFFIX}`;
                const rawValueOriginal: PrimitiveValue = row[fieldHighlight];
                const shouldHighlight =
                    isCrossHighlight && f.source === 'values';
                row[fieldName] = rawValue;
                if (shouldHighlight) {
                    row[fieldHighlightStatus] = resolveHighlightStatus(
                        hasHighlights,
                        rawValue,
                        rawValueOriginal
                    );
                    row[fieldHighlightComparator] = resolveHighlightComparator(
                        rawValue,
                        rawValueOriginal
                    );
                }
            }
            if (isDrilldown) {
                row[DATASET_ROLE_DRILLDOWN] = resolveDrilldownComponents(
                    row?.[DATASET_ROLE_DRILLDOWN],
                    rawValue,
                    f.column.format
                );
                row[DATASET_ROLE_DRILLDOWN_FLAT] = resolveDrilldownFlat(
                    row?.[DATASET_ROLE_DRILLDOWN_FLAT],
                    rawValue,
                    f.column.format
                );
            }
            return row;
        },
        <IVisualDatasetValueRow>{}
    );
};

/**
 * Get current processed dataset (metadata and values) from Deneb's store.
 */
export const getDataset = (): IDataset => getState().dataset;

/**
 * Ensures an empty dataset is made available.
 */
export const getEmptyDataset = (): IDataset => ({
    fields: {},
    hashValue: getHashValue({}),
    values: [],
    hasDrilldown: false,
    hasHighlights: false,
    rowsLoaded: 0
});

/**
 * Processes the data in the visual's data view into an object suitable for the
 * visual's API.
 */
export const getMappedDataset = (
    categorical: DataViewCategorical
): IDataset => {
    const rowsLoaded = getRowCount(categorical);
    const empty = getEmptyDataset();
    const dvCategories = categorical?.categories;
    const dvValues = categorical?.values;
    const hasDataView = (dvCategories || dvValues) && true;
    if (!hasDataView) {
        return empty;
    } else {
        try {
            logTimeStart('getMappedDataset');
            const isCrossFilter = isCrossFilterPropSet();
            const hasHighlights = getHighlightStatus(dvValues);
            const columns = getDatasetFieldEntries(dvCategories, dvValues);
            const hasDrilldown =
                isDrilldownFeatureEnabled() &&
                columns.filter((c) => c.column.roles?.[DATASET_ROLE_DRILLDOWN])
                    ?.length > 0;
            const fieldValues = getDatasetValueEntries(dvCategories, dvValues);
            const selections: ISelectionId[] = <ISelectionId[]>(
                getVisualSelectionManager().getSelectionIds()
            );
            const fields = getDatasetFields(dvCategories, dvValues);
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
            const values: IVisualDatasetValueRow[] = range(rowsLoaded).map(
                (r, ri) => {
                    const md = getDataRow(
                        columns,
                        fieldValues,
                        ri,
                        hasHighlights,
                        hasDrilldown
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
                }
            );
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
