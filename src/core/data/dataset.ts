import powerbi from 'powerbi-visuals-api';
import DataViewCategorical = powerbi.DataViewCategorical;
import ISelectionId = powerbi.visuals.ISelectionId;
import PrimitiveValue = powerbi.PrimitiveValue;

import range from 'lodash/range';
import reduce from 'lodash/reduce';

import {
    IAugmentedMetadataField,
    IVisualDataset,
    IVisualDatasetFields,
    IVisualDatasetValueRow
} from '.';
import {
    castPrimitiveValue,
    getHighlightStatus,
    getRowCount,
    resolveHighlightComparator,
    resolveHighlightStatus
} from './dataView';
import {
    getDatasetFieldsInclusive,
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
import { hostServices } from '../services';
import { getState } from '../../store';
import {
    DATASET_NAME,
    HIGHLIGHT_COMPARATOR_SUFFIX,
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX
} from '../../constants';

/**
 * Compare two sets of dataset metadata, as well as the current state of the
 * comparison (if supplied) to ensure that any discrepancies can still be
 * flagged to Deneb for addressing by the creator.
 */
export const doUnallocatedFieldsExist = (
    fieldsAvailable: IVisualDatasetFields,
    fieldsUsed: IVisualDatasetFields,
    currentResult = false
) =>
    reduce(
        fieldsUsed,
        (result, value, key) => !(key in fieldsAvailable) || result,
        false
    ) || currentResult;

/**
 * For supplied data view field metadata, produce a suitable object
 * representation of the row that corresponds with the dataset metadata.
 */
const getDataRow = (
    fields: IAugmentedMetadataField[],
    values: PrimitiveValue[][],
    rowIndex: number,
    hasHighlights: boolean
) =>
    reduce(
        fields,
        (row, f, fi) => {
            if (f?.column.roles?.[DATASET_NAME]) {
                const rawValue = castPrimitiveValue(f, values[fi][rowIndex]);
                const fieldName = getEncodedFieldName(f.column.displayName);
                const fieldHighlight = `${fieldName}${HIGHLIGHT_FIELD_SUFFIX}`;
                const fieldHighlightStatus = `${fieldName}${HIGHLIGHT_STATUS_SUFFIX}`;
                const fieldHighlightComparator = `${fieldName}${HIGHLIGHT_COMPARATOR_SUFFIX}`;
                const rawValueOriginal: PrimitiveValue = row[fieldHighlight];
                const shouldHighlight =
                    isCrossHighlightPropSet() && f.source === 'values';
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
            return row;
        },
        <IVisualDatasetValueRow>{}
    );

/**
 * Get current processed dataset (metadata and values) from Deneb's store.
 */
export const getDataset = (): IVisualDataset => getState().dataset;

/**
 * Ensures an empty dataset is made available.
 */
export const getEmptyDataset = (): IVisualDataset => ({
    fields: {},
    values: [],
    hasHighlights: false
});

/**
 * Processes the data in the visual's data view into an object suitable for the
 * visual's API.
 */
export const getMappedDataset = (
    categorical: DataViewCategorical
): IVisualDataset => {
    const rowCount = getRowCount(categorical);
    const empty = getEmptyDataset();
    if (rowCount === 0) {
        return empty;
    } else {
        try {
            const dvCategories = categorical?.categories;
            const dvValues = categorical?.values;
            const hasHighlights = getHighlightStatus(dvValues);
            const columns = getDatasetFieldEntries(dvCategories, dvValues);
            const fieldValues = getDatasetValueEntries(dvCategories, dvValues);
            const selections: ISelectionId[] = <ISelectionId[]>(
                hostServices.selectionManager.getSelectionIds()
            );
            const fields = getDatasetFields(dvCategories, dvValues);
            const values: IVisualDatasetValueRow[] = range(rowCount).map(
                (r, ri) => {
                    const md = getDataRow(
                        columns,
                        fieldValues,
                        ri,
                        hasHighlights
                    );
                    const identity = createSelectionIds(
                        getDatasetFieldsInclusive(fields),
                        dvCategories,
                        [r]
                    )[0];
                    return {
                        ...{
                            __row__: r,
                            __identity__: identity,
                            __key__: getSidString(identity)
                        },
                        ...(isCrossFilterPropSet() && {
                            __selected__: getDataPointCrossFilterStatus(
                                identity,
                                selections
                            )
                        }),
                        ...md
                    };
                }
            );
            return {
                hasHighlights,
                fields,
                values
            };
        } catch (e) {
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
