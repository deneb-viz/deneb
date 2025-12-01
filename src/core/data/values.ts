import powerbi from 'powerbi-visuals-api';
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumns = powerbi.DataViewValueColumns;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import PrimitiveValue = powerbi.PrimitiveValue;

import reduce from 'lodash/reduce';

import { getFormattedValue } from '@deneb-viz/powerbi-compat/formatting';
import { logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import { isCrossHighlightPropSet } from '@deneb-viz/powerbi-compat/interactivity';
import { doesDataViewHaveHighlights } from '@deneb-viz/powerbi-compat/visual-host';
import { isFieldEligibleForFormatting } from '@deneb-viz/dataset/field';

/**
 * Enumerate all relevant areas of the data view to get an array of all
 * distinct fields (and their values as equal-length nested arrays)
 */
export const getDatasetValueEntries = (
    categories: DataViewCategoryColumn[],
    values: DataViewValueColumns,
    enableHighlight: boolean
) => {
    return [
        ...getCategoryEntries(categories),
        ...((enableHighlight && getHighlightEntries(values, enableHighlight)) ||
            []),
        ...getValueEntries(values, enableHighlight),
        ...getFormattingStringEntries(values)
    ];
};

/**
 * Extract all categorical field value arrays from the data view.
 */
const getCategoryEntries = (
    categories: DataViewCategoryColumn[]
): PrimitiveValue[][] => {
    logTimeStart('getCategoryEntries');
    const entries = categories?.map((c) => c.values) || [];
    logTimeEnd('getCategoryEntries');
    return entries;
};

/**
 * For measures, return the formatting string per row, and the formatted value.
 */
const getFormattingStringEntries = (
    values: DataViewValueColumns
): PrimitiveValue[][] => {
    logTimeStart('getFormattingStringEntries');
    const entries = reduce(
        values || [],
        (acc, v: DataViewValueColumn) => {
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
        <PrimitiveValue[][]>[]
    );
    logTimeEnd('getFormattingStringEntries');
    return entries;
};

/**
 * For a given value column and row index, extract the formatting string. Order
 * of precedence is the column definition, and then the object definition at
 * row level (as a dynamic format string may be possible).
 */
const getFormatStringForValueByIndex = (
    valueColumn: DataViewValueColumn,
    index: number
): string =>
    <string>(
        (valueColumn?.source?.format ??
            valueColumn?.objects?.[index]?.general?.formatString)
    );

/**
 * If we're using cross-highlight functionality, we need to get/set the
 * highlight entries accordingly. If no highlights are applied, we need to sub-
 * in the regular values so that any logic is correctly preserved.
 */
const getHighlightEntries = (
    values: DataViewValueColumns,
    enableHighlight: boolean
): PrimitiveValue[][] => {
    logTimeStart('getHighlightEntries');
    const entries =
        (values || [])?.map((v: DataViewValueColumn) =>
            isCrossHighlightPropSet({ enableHighlight }) &&
            doesDataViewHaveHighlights(values)
                ? v.highlights
                : v.values
        ) || [];
    logTimeEnd('getHighlightEntries');
    return entries;
};

/**
 * Extract all measure field value arrays from the data view. We try to assist
 * the creator if they haven't explicitly enabled cross-highlighting and aren't
 * using the cross-filter interaction on the visual by substituting the
 * highlight values passed in by Power BI
 */
const getValueEntries = (
    values: DataViewValueColumns,
    enableHighlight: boolean
): PrimitiveValue[][] => {
    logTimeStart('getValueEntries');
    const entries = (values || [])?.map((v: DataViewValueColumn) => {
        const useHighlights =
            doesDataViewHaveHighlights(values) &&
            !isCrossHighlightPropSet({ enableHighlight });
        return useHighlights ? v.highlights : v.values;
    });
    logTimeEnd('getValueEntries');
    return entries;
};

/** Avoids linting issues (can't seem to disable w/eslint-disable). Can be
 *  removed if/when we extend this module.
 */
export const values = null;
