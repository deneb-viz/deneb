import {
    HIGHLIGHT_COMPARATOR_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX,
    HIGHLIGHT_FIELD_SUFFIX
} from '../../constants';
import { getVegaSettings } from '../../core/vega';
import { getVisualInteractionStatus } from '../visual-host';

/**
 * Provides all highlight field suffixes, suitable for a RegExp expression.
 */
export const getCrossHighlightRegExpAlternation = () =>
    `${HIGHLIGHT_COMPARATOR_SUFFIX}|${HIGHLIGHT_STATUS_SUFFIX}|${HIGHLIGHT_FIELD_SUFFIX}`;

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
        getCrossHighlightRegExpAlternation()
    );
    return field.match(pattern)?.[1] || field;
};

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
 * Determine if conditions are right to expose highlight functionality.
 */
export const isCrossHighlightPropSet = () => {
    const { enableHighlight } = getVegaSettings();
    return (getVisualInteractionStatus() && enableHighlight) || false;
};

/**
 * Confirms whether the supplied field name is a cross-highlight status.
 */
export const isCrossHighlightStatusField = (field: string) =>
    getCrossHighlightFieldRegExp(HIGHLIGHT_STATUS_SUFFIX).test(field);
