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
    highlightComparatorSuffix,
    highlightFieldSuffix,
    highlightStatusSuffix,
    isHighlightPropSet
} from '../interactivity/highlight';
import {
    createSelectionIds,
    getDataPointStatus,
    getSidString
} from '../interactivity/selection';
import { hostServices } from '../services';
import { getState } from '../../store';

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
            if (f?.column.roles?.dataset) {
                const rawValue = castPrimitiveValue(f, values[fi][rowIndex]);
                const fieldName = getEncodedFieldName(f.column.displayName);
                const fieldHighlight = `${fieldName}${highlightFieldSuffix}`;
                const fieldHighlightStatus = `${fieldName}${highlightStatusSuffix}`;
                const fieldHighlightComparator = `${fieldName}${highlightComparatorSuffix}`;
                const rawValueOriginal: PrimitiveValue = row[fieldHighlight];
                const shouldHighlight =
                    isHighlightPropSet() && f.source === 'values';
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
                            __identity__: identity,
                            __key__: getSidString(identity),
                            identityIndex: r,
                            __selected__: getDataPointStatus(
                                identity,
                                selections
                            )
                        },
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
