import powerbi from 'powerbi-visuals-api';

import { logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import { doesDataViewHaveHighlights } from './data-view';
import type { AugmentedMetadataField } from './types';
import { isFieldEligibleForFormatting } from './fields';
import { isCrossHighlightPropSet } from '../interactivity';

/**
 * For a Power BI primitive, apply any data type-specific logic before returning a value that can work with the visual dataset.
 */
export const getCastedPrimitiveValue = (
    field: AugmentedMetadataField,
    value: powerbi.PrimitiveValue
) =>
    field?.column?.type?.dateTime && value != null
        ? new Date(value.toString())
        : value;

/**
 * Extract all categorical field value arrays from the data view.
 */
const getCategoryValueEntries = (
    categories: powerbi.DataViewCategoryColumn[]
): powerbi.PrimitiveValue[][] => {
    logTimeStart('getCategoryValueEntries');
    const entries = categories?.map((c) => c.values) || [];
    logTimeEnd('getCategoryValueEntries');
    return entries;
};

/**
 * Enumerate all relevant areas of the data view to get an array of all distinct fields (and their values as equal-
 * length nested arrays).
 */
export const getDatumValueEntriesFromDataview = (
    categories: powerbi.DataViewCategoryColumn[],
    values: powerbi.DataViewValueColumns
) => {
    return [
        ...getCategoryValueEntries(categories),
        ...((isCrossHighlightPropSet() && getHighlightValueEntries(values)) ||
            []),
        ...getMeasureValueEntries(values),
        ...getFormattingStringValueEntries(values)
    ];
};

/**
 * Emit two PARITY PLACEHOLDER slots per formatting-eligible measure.
 *
 * These slots historically held the resolved format string and the formatted
 * value for every row of each numeric/dateTime measure. They are appended after
 * every column entry in `getDatumValueEntriesFromDataview` and are therefore
 * index-parallel with the trailing `getMeasureFormatEntries` columns produced by
 * `getDatumFieldMetadataFromDataView` (source: 'formatting'). No consumer reads
 * them: `buildDataRow` sources dataset values via `planFieldIndices` — which
 * selects only source columns ('categories'/'values'), never 'formatting' — and
 * the __format__/__formatted__ support fields are derived per-row by the
 * support-field provider instead. Drilldown reads only columns carrying the
 * drill role, which are grouping categories, never these measure-derived slots.
 *
 * So the format-string resolution and per-row formatting done here were pure
 * discarded work (and, for a legacy spec that emits __formatted__ everywhere,
 * duplicated the provider's per-row cost). We now emit the raw value-array
 * reference twice as a zero-cost placeholder, purely to keep `fieldValues` the
 * same length as (and index-parallel with) the `columns` array.
 */
const getFormattingStringValueEntries = (
    values: powerbi.DataViewValueColumns
): powerbi.PrimitiveValue[][] =>
    // No timing instrumentation: the body is two array pushes per eligible
    // measure — the logTime overhead would exceed the measured work and skew
    // profiling output.
    values?.reduce<powerbi.PrimitiveValue[][]>((acc, v) => {
        if (isFieldEligibleForFormatting(v)) {
            // Two parity placeholders (was: format strings + formatted
            // values). The raw value array reference is never read — it only
            // keeps the index alignment with the columns array intact.
            acc.push(v.values);
            acc.push(v.values);
        }
        return acc;
    }, []) || [];

/**
 * If we're using cross-highlight functionality, we need to get/set the highlight entries accordingly. If no highlights
 * are applied, we need to sub-in the regular values so that any logic is correctly preserved.
 */
const getHighlightValueEntries = (
    values: powerbi.DataViewValueColumns
): powerbi.PrimitiveValue[][] => {
    logTimeStart('getHighlightValueEntries');
    // Per-column highlight fallback (M9): a mixed-highlight dataview can have
    // some value columns with a `highlights` array and some without. A column
    // without highlights yields `undefined` here, which becomes an undefined
    // entry that crashes row building and silently drops the whole dataset.
    // Fall back to that column's own values so it still contributes a row.
    const entries =
        values?.map((v) =>
            isCrossHighlightPropSet() && doesDataViewHaveHighlights(values)
                ? (v.highlights ?? v.values)
                : v.values
        ) || [];
    logTimeEnd('getHighlightValueEntries');
    return entries;
};

/**
 * Extract all measure field value arrays from the data view. We try to assist the creator if they haven't explicitly
 * enabled cross-highlighting and aren't using the cross-filter interaction on the visual by substituting the highlight
 * values passed in by Power BI.
 */
const getMeasureValueEntries = (
    values: powerbi.DataViewValueColumns
): powerbi.PrimitiveValue[][] => {
    logTimeStart('getMeasureValueEntries');
    // Per-column highlight fallback (M9): see getHighlightValueEntries. When
    // Power BI supplies highlights but the creator hasn't opted into
    // cross-highlighting, we substitute highlight values — but a column that
    // has no highlights would otherwise inject `undefined` and drop the
    // dataset, so fall back to that column's values.
    const entries =
        values?.map((v) => {
            const useHighlights =
                doesDataViewHaveHighlights(values) &&
                !isCrossHighlightPropSet();
            return useHighlights ? (v.highlights ?? v.values) : v.values;
        }) || [];
    logTimeEnd('getMeasureValueEntries');
    return entries;
};
