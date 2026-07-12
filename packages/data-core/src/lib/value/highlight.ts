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
        // Symmetric with getHighlightStatusValue's L13 guard: an `undefined`
        // comparator (an out-of-bounds read of a short highlights array) has no
        // value to compare against. DataPointHighlightComparator has no
        // "absent" member, so it deliberately resolves to 'neq' — the paired
        // __highlight_status__ field carries the on/off distinction.
        case comparatorValue === undefined:
            return 'neq';
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
