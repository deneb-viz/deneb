import powerbi from 'powerbi-visuals-api';
import DataViewValueColumns = powerbi.DataViewValueColumns;
import PrimitiveValue = powerbi.PrimitiveValue;

import { getState } from '../../store';
import {
    type DataPointHighlightComparator,
    type DataPointSelectionStatus
} from '@deneb-viz/powerbi-compat/interactivity';
import { type AugmentedMetadataField } from '@deneb-viz/dataset/field';

/**
 * For a Power BI primitive, apply any data type-specific logic before returning a value that can work with the visual dataset.
 */
export const castPrimitiveValue = (
    field: AugmentedMetadataField,
    value: PrimitiveValue
) =>
    field?.column.type.dateTime && value !== null
        ? new Date(value?.toString())
        : value;

/**
 * Retrieve all `powerbi.DataViewCategoryColumn[]` entries from the visual's data view, which are available from Deneb's store.
 */
export const getCategoryColumns = () => getState().datasetCategories || [];

/**
 * Process the data view values to determine if any of them have a highlights array.
 */
export const getHighlightStatus = (values: DataViewValueColumns) =>
    values?.filter((v) => v.highlights).length > 0;

/**
 * For a field, determine if a highlight has been explicitly applied or not (similar to selection)
 */
export const resolveHighlightStatus = (
    hasHighlights: boolean,
    fieldValue: PrimitiveValue,
    comparatorValue: PrimitiveValue
): DataPointSelectionStatus => {
    switch (true) {
        case !hasHighlights:
            return 'neutral';
        case hasHighlights && fieldValue === null && comparatorValue !== null:
            return 'off';
        default:
            return 'on';
    }
};

/**
 * For a field, determine its comparator value for highlight purposes.
 */
export const resolveHighlightComparator = (
    fieldValue: PrimitiveValue,
    comparatorValue: PrimitiveValue
): DataPointHighlightComparator => {
    switch (true) {
        case fieldValue == comparatorValue:
            return 'eq';
        case comparatorValue < fieldValue:
            return 'lt';
        case comparatorValue > fieldValue:
            return 'gt';
        default:
            return 'neq';
    }
};
