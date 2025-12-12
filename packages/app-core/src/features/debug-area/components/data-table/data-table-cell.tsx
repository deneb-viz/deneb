import { isDate, isFunction, isNumber } from 'vega';

import {
    isCrossHighlightComparatorField,
    isCrossHighlightStatusField,
    SELECTED_ROW_FIELD_NAME
} from '@deneb-viz/powerbi-compat/dataset';
import {
    type DataPointHighlightComparator,
    type DataPointSelectionStatus,
    getSanitizedTooltipValue
} from '@deneb-viz/powerbi-compat/interactivity';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { getPrunedObject } from '@deneb-viz/utils/object';

type DataTableCellProps = {
    displayValue: string;
    field: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawValue: any;
};

/**
 * Handles rendering a cell in the data table, with a tooltip, and allowing
 * for any formatting specifics (such as truncating long values).
 */
export const DataTableCell = ({
    displayValue,
    field,
    rawValue
}: DataTableCellProps) => {
    const tooltipValue = getCellTooltip(field, rawValue);
    return <div title={tooltipValue}>{displayValue}</div>;
};

/**
 * For a given column, checks for any special conditions and returns a
 * customized tooltip for the current cell.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getCellTooltip = (field: string, value: any) => {
    switch (true) {
        case field === SELECTED_ROW_FIELD_NAME:
            return getCellCrossFilterTooltip(value);
        case isCrossHighlightComparatorField(field):
            return getCellHighlightComparatorTooltip(value);
        case isCrossHighlightStatusField(field):
            return getCellHighlightComparatorStatus(value);
        case isValuePlaceholderComplex(value):
            return getI18nValue('Table_Tooltip_TooLong');
        case isDate(value):
            return new Date(value).toUTCString();
        case isNumber(value):
            return formatNumberValueForTable(value);
        case isFunction(value):
            return value.toString();
        default:
            return getSanitizedTooltipValue(value);
    }
};

/**
 * Handle the display and translation of number values for a table. Borrowed
 * and adapted from vega-editor.
 */
const formatNumberValueForTable = (value: number, tooltip = false) =>
    isNaN(value)
        ? getI18nValue('Table_Placeholder_NaN')
        : value === Number.POSITIVE_INFINITY
          ? getI18nValue('Table_Placeholder_Infinity')
          : value === Number.NEGATIVE_INFINITY
            ? `-${getI18nValue('Table_Placeholder_Infinity')}`
            : getStringifiedDisplayValue(value, tooltip);

/**
 * If the column/cell relates to cross-filtering, return a tooltip value that
 * is contextual for the displayed value.
 */
const getCellCrossFilterTooltip = (value: DataPointSelectionStatus) => {
    switch (value) {
        case 'neutral':
            return getI18nValue('Pivot_Debug_SelectedNeutral');
        case 'on':
            return getI18nValue('Pivot_Debug_SelectedOn');
        case 'off':
            return getI18nValue('Pivot_Debug_SelectedOff');
    }
};

/**
 * If the column/cell relates to a cross-highlight status, return a tooltip
 * value that is contextual for the displayed value.
 */
const getCellHighlightComparatorStatus = (value: DataPointSelectionStatus) => {
    switch (value) {
        case 'neutral':
            return getI18nValue('Pivot_Debug_HighlightStatusNeutral');
        case 'on':
            return getI18nValue('Pivot_Debug_HighlightStatusOn');
        case 'off':
            return getI18nValue('Pivot_Debug_HighlightStatusOff');
    }
};

/**
 * If the column/cell relates to a cross-highlight comparator, return a tooltip
 * value that is contextual for the displayed value.
 */
const getCellHighlightComparatorTooltip = (
    value: DataPointHighlightComparator
) => {
    switch (value) {
        case 'eq':
            return getI18nValue('Pivot_Debug_HighlightComparatorEq');
        case 'lt':
            return getI18nValue('Pivot_Debug_HighlightComparatorLt');
        case 'gt':
            return getI18nValue('Pivot_Debug_HighlightComparatorGt');
        case 'neq':
            return getI18nValue('Pivot_Debug_HighlightComparatorNeq');
    }
};

/**
 * Handle the processing of a stringified value within a data table.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getStringifiedDisplayValue = (value: any, tooltip = false) => {
    const pruned = getPrunedObject(value);
    return tooltip ? getSanitizedTooltipValue(pruned) : pruned;
};

/**
 * Determines whether a supplied value matches one of the 'placeholder' values
 * for a table cell.
 */
const isValuePlaceholderComplex = (value: string) =>
    value === getI18nValue('Table_Placeholder_TooLong') ||
    value === getI18nValue('Table_Placeholder_Object') ||
    value === getI18nValue('Table_Placeholder_Circular') ||
    false;
