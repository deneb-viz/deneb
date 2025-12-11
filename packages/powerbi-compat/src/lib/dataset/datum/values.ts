import powerbi from 'powerbi-visuals-api';

import { logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import { isFieldEligibleForFormatting } from '../field';
import { getFormattedValue } from '../../formatting';
import { isCrossHighlightPropSet } from '../../interactivity';
import { doesDataViewHaveHighlights } from '../../visual-host';

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
    enableHighlight: boolean
) => {
    return [
        ...getCategoryValueEntries(categories),
        ...((enableHighlight &&
            getHighlightValueEntries(values, enableHighlight)) ||
            []),
        ...getMeasureValueEntries(values, enableHighlight),
        ...getFormattingStringValueEntries(values)
    ];
};

/**
 * For measures, return the formatting string per row, and the formatted value.
 */
const getFormattingStringValueEntries = (
    values: powerbi.DataViewValueColumns
): powerbi.PrimitiveValue[][] => {
    logTimeStart('getFormattingStringEntries');
    const entries = (values || []).reduce(
        (acc, v: powerbi.DataViewValueColumn) => {
            if (isFieldEligibleForFormatting(v)) {
                const values = v.values;
                const formatStrings = values.map((vv, vvi) =>
                    getFormatStringForValueByIndex(v, vvi)
                );
                const formattedValues = values.map((vv, vvi) =>
                    getFormattedValue(vv, formatStrings[vvi])
                );
                acc.push(formatStrings);
                acc.push(formattedValues);
            }
            return acc;
        },
        <powerbi.PrimitiveValue[][]>[]
    );
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
): string =>
    <string>(
        (valueColumn?.source?.format ??
            valueColumn?.objects?.[index]?.general?.formatString)
    );

/**
 * If we're using cross-highlight functionality, we need to get/set the highlight entries accordingly. If no highlights
 * are applied, we need to sub-in the regular values so that any logic is correctly preserved.
 */
const getHighlightValueEntries = (
    values: powerbi.DataViewValueColumns,
    enableHighlight: boolean
): powerbi.PrimitiveValue[][] => {
    logTimeStart('getHighlightValueEntries');
    const entries = ((values || [])?.map((v: powerbi.DataViewValueColumn) =>
        isCrossHighlightPropSet({ enableHighlight }) &&
        doesDataViewHaveHighlights(values)
            ? v.highlights
            : v.values
    ) || []) as powerbi.PrimitiveValue[][];
    logTimeEnd('getHighlightValueEntries');
    return entries;
};

/**
 * Extract all measure field value arrays from the data view. We try to assist the creator if they haven't explicitly
 * enabled cross-highlighting and aren't using the cross-filter interaction on the visual by substituting the highlight
 * values passed in by Power BI.
 */
const getMeasureValueEntries = (
    values: powerbi.DataViewValueColumns,
    enableHighlight: boolean
): powerbi.PrimitiveValue[][] => {
    logTimeStart('getMeasureValueEntries');
    const entries = (values || [])?.map((v: powerbi.DataViewValueColumn) => {
        const useHighlights =
            doesDataViewHaveHighlights(values) &&
            !isCrossHighlightPropSet({ enableHighlight });
        return useHighlights ? v.highlights : v.values;
    }) as powerbi.PrimitiveValue[][];
    logTimeEnd('getMeasureValueEntries');
    return entries;
};
