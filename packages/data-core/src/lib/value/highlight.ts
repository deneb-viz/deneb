import type {
    DataPointHighlightComparator,
    DataPointSelectionStatus,
    PrimitiveValue
} from './types';

/**
 * For a field, determine its comparator value for highlight purposes.
 */
export const getHighlightComparatorValue = (
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

/**
 * For a field, determine if a highlight has been explicitly applied or not (similar to selection)
 */
export const getHighlightStatusValue = (
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
