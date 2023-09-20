import powerbi from 'powerbi-visuals-api';
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumns = powerbi.DataViewValueColumns;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import PrimitiveValue = powerbi.PrimitiveValue;

import reduce from 'lodash/reduce';

import { isCrossHighlightPropSet } from '../../features/interactivity';
import { getVegaSettings } from '../vega';
import { getHighlightStatus } from './dataView';
import { powerBiFormatValue } from '../../utils';
import { isDataViewFieldEligibleForFormatting } from '../../features/dataset';

/**
 * Enumerate all relevant areas of the data view to get an array of all
 * distinct fields (and their values as equal-length nested arrays)
 */
export const getDatasetValueEntries = (
    categories: DataViewCategoryColumn[],
    values: DataViewValueColumns
) => {
    const { enableHighlight } = getVegaSettings();
    return [
        ...getCategoryEntries(categories),
        ...((enableHighlight && getHighlightEntries(values)) || []),
        ...getValueEntries(values),
        ...getFormattingStringEntries(values)
    ];
};

/**
 * Extract all categorical field value arrays from the data view.
 */
const getCategoryEntries = (
    categories: DataViewCategoryColumn[]
): PrimitiveValue[][] => categories?.map((c) => c.values) || [];

/**
 * For measures, return the formatting string per row, and the formatted value.
 */
const getFormattingStringEntries = (
    values: DataViewValueColumns
): PrimitiveValue[][] => {
    return reduce(
        values || [],
        (acc, v: DataViewValueColumn) => {
            if (isDataViewFieldEligibleForFormatting(v)) {
                const values = v.values;
                const formatStrings = values.map((vv, vvi) =>
                    getFormatStringForValueByIndex(v, vvi)
                );
                const formattedValues = values.map((vv, vvi) =>
                    powerBiFormatValue(vv, formatStrings[vvi])
                );
                acc.push(formatStrings);
                acc.push(formattedValues);
            }
            return acc;
        },
        <PrimitiveValue[][]>[]
    );
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
    values: DataViewValueColumns
): PrimitiveValue[][] =>
    (values || [])?.map((v: DataViewValueColumn) =>
        isCrossHighlightPropSet() && getHighlightStatus(values)
            ? v.highlights
            : v.values
    ) || [];

/**
 * Extract all measure field value arrays from the data view. We try to assist
 * the creator if they haven't explicitly enabled cross-highlighting and aren't
 * using the cross-filter interaction on the visual by substituting the
 * highlight values passed in by Power BI
 */
const getValueEntries = (values: DataViewValueColumns): PrimitiveValue[][] =>
    (values || [])?.map((v: DataViewValueColumn) => {
        const useHighlights =
            getHighlightStatus(values) && !isCrossHighlightPropSet();
        return useHighlights ? v.highlights : v.values;
    });

/** Avoids linting issues (can't seem to disable w/eslint-disable). Can be
 *  removed if/when we extend this module.
 */
export const values = null;
