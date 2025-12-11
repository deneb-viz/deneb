import powerbi from 'powerbi-visuals-api';

import {
    HIGHLIGHT_COMPARATOR_SUFFIX,
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX
} from './constants';
import {
    type DataPointSelectionStatus,
    type DataPointHighlightComparator
} from '../../interactivity';

/**
 * Produces a simple RegExp pattern for matching highlight fields.
 */
const getCrossHighlightFieldRegExp = (pattern: string) =>
    new RegExp(`(.*)(${pattern})`);

/**
 * Tests a supplied field name for highlight field 'reserved' names and returns
 * the measure/field it was applied to.
 */
export const getCrossHighlightFieldBaseMeasureName = (field: string) => {
    const pattern = getCrossHighlightFieldRegExp(
        getHighlightRegExpAlternation()
    );
    return field.match(pattern)?.[1] || field;
};

/**
 * For a field, determine its comparator value for highlight purposes.
 */
export const getHighlightComparatorValue = (
    fieldValue: powerbi.PrimitiveValue,
    comparatorValue: powerbi.PrimitiveValue
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
    fieldValue: powerbi.PrimitiveValue,
    comparatorValue: powerbi.PrimitiveValue
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
 * Provides all highlight field suffixes, suitable for a RegExp expression.
 */
export const getHighlightRegExpAlternation = () =>
    `${HIGHLIGHT_COMPARATOR_SUFFIX}|${HIGHLIGHT_STATUS_SUFFIX}|${HIGHLIGHT_FIELD_SUFFIX}`;

/**
 * Confirms whether the supplied field name is a cross-highlight comparator.
 */
export const isCrossHighlightComparatorField = (field: string) =>
    getCrossHighlightFieldRegExp(HIGHLIGHT_COMPARATOR_SUFFIX).test(field);

/**
 * Confirms whether the supplied field name is used for cross-highlight
 * values.
 */
export const isCrossHighlightField = (field: string) =>
    getCrossHighlightFieldRegExp(HIGHLIGHT_FIELD_SUFFIX).test(field);

/**
 * Confirms whether the supplied field name is a cross-highlight status.
 */
export const isCrossHighlightStatusField = (field: string) =>
    getCrossHighlightFieldRegExp(HIGHLIGHT_STATUS_SUFFIX).test(field);
