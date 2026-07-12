import powerbi from 'powerbi-visuals-api';

import { logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import { getFormattedValue } from '@deneb-viz/powerbi-compat/formatting';
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
    values: powerbi.DataViewValueColumns,
    locale: string
) => {
    return [
        ...getCategoryValueEntries(categories),
        ...((isCrossHighlightPropSet() && getHighlightValueEntries(values)) ||
            []),
        ...getMeasureValueEntries(values),
        ...getFormattingStringValueEntries(values, locale)
    ];
};

/**
 * For measures, return the formatting string per row, and the formatted value.
 */
const getFormattingStringValueEntries = (
    values: powerbi.DataViewValueColumns,
    locale: string
): powerbi.PrimitiveValue[][] => {
    logTimeStart('getFormattingStringEntries');
    const entries =
        values?.reduce<powerbi.PrimitiveValue[][]>((acc, v) => {
            if (isFieldEligibleForFormatting(v)) {
                const values = v.values;
                const formatStrings = values.map((vv, vvi) =>
                    getFormatStringForValueByIndex(v, vvi)
                );
                const formattedValues = values.map((vv, vvi) =>
                    getFormattedValue(vv, formatStrings[vvi], {
                        cultureSelector: locale
                    })
                );
                acc.push(formatStrings);
                acc.push(formattedValues);
            }
            return acc;
        }, []) || [];
    logTimeEnd('getFormattingStringEntries');
    return entries;
};

/**
 * For a given value column and row index, extract the formatting string. Order of precedence is the column definition,
 * and then the object definition at row level (as a dynamic format string may be possible).
 */
const getFormatStringForValueByIndex = (
    valueColumn: powerbi.DataViewValueColumn,
    index: number
): string | undefined =>
    valueColumn?.source?.format ??
    (valueColumn?.objects?.[index]?.general?.formatString as
        | string
        | undefined);

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
