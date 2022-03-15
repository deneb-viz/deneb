import powerbi from 'powerbi-visuals-api';
import { isHighlightPropSet } from '../interactivity/highlight';
import { getVegaSettings } from '../vega';
import { getHighlightStatus } from './dataView';
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumns = powerbi.DataViewValueColumns;
import PrimitiveValue = powerbi.PrimitiveValue;

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
        ...getValueEntries(values)
    ];
};

/**
 * Extract all categorical field value arrays from the data view.
 */
const getCategoryEntries = (
    categories: DataViewCategoryColumn[]
): PrimitiveValue[][] => categories?.map((c) => c.values) || [];

/**
 * If we're using cross-highlight functionality, we need to get/set the
 * highlight entries accordingly. If no highlights are applied, we need to sub-
 * in the regular values so that any logic is correctly preserved.
 */
const getHighlightEntries = (
    values: DataViewValueColumns
): PrimitiveValue[][] =>
    (values || [])?.map((v) =>
        isHighlightPropSet() && getHighlightStatus(values)
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
    (values || [])?.map((v) => {
        const useHighlights =
            getHighlightStatus(values) && !isHighlightPropSet();
        return useHighlights ? v.highlights : v.values;
    });

/** Avoids linting issues (can't seem to disable w/eslint-disable). Can be
 *  removed if/when we extend this module.
 */
export const values = null;
