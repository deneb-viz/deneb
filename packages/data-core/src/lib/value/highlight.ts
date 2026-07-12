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
        // Defensive (audit L13): Power BI supplies a highlights array that is
        // row-length and null-padded, so an `undefined` comparator can only
        // arise from an out-of-bounds read (a highlights array shorter than
        // values — a contract we could not verify). Treat it as "not
        // highlighted" so a row with no highlight datum is never reported 'on'.
        case comparatorValue === undefined:
            return 'off';
        case hasHighlights && fieldValue === null && comparatorValue !== null:
            return 'off';
        default:
            return 'on';
    }
};
