import { textMeasurementService } from 'powerbi-visuals-utils-formattingutils';
import { isDate, isFunction, isNumber } from 'vega';

import { TABLE_COLUMN_RESERVED_WORDS } from '../../constants';
import { getPrunedObject } from '../json-processing';
import {
    getCrossHighlightFieldBaseMeasureName,
    getSanitisedTooltipValue,
    isCrossHighlightComparatorField,
    isCrossHighlightField,
    isCrossHighlightStatusField,
    TDataPointHighlightComparator
} from '../interactivity';
import { DATA_TABLE_FONT_FAMILY, DATA_TABLE_FONT_SIZE } from '.';
import { getI18nValue } from '../i18n';
import { type IWorkerDatasetViewerTranslations } from '@deneb-viz/app-core';
import {
    ROW_IDENTITY_FIELD_NAME,
    ROW_INDEX_FIELD_NAME,
    SELECTED_ROW_FIELD_NAME
} from '@deneb-viz/dataset/field';
import { type DataPointSelectionStatus } from '@deneb-viz/powerbi-compat/interactivity';

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
 * For a given column, checks for any special conditions and returns a
 * customized tooltip for the current cell.
 */
export const getCellTooltip = (field: string, value: any) => {
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
            return getSanitisedTooltipValue(value);
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
    value: TDataPointHighlightComparator
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
 * For a given column, checks for any special conditions and returns a
 * customized tooltip for the column header.
 */
export const getColumnHeaderTooltip = (column: string) => {
    switch (true) {
        case isTableColumnNameReserved(column):
            return getReservedTableColumnTooltip(column);
        case isCrossHighlightComparatorField(column):
            return getI18nValue('Pivot_Dataset_HighlightComparatorField', [
                getCrossHighlightFieldBaseMeasureName(column),
                getI18nValue('Pivot_Debug_HighlightComparatorEq'),
                getI18nValue('Pivot_Debug_HighlightComparatorLt'),
                getI18nValue('Pivot_Debug_HighlightComparatorGt'),
                getI18nValue('Pivot_Debug_HighlightComparatorNeq'),
                getI18nValue('Pivot_Debug_Refer_Documentation')
            ]);
        case isCrossHighlightStatusField(column):
            return getI18nValue('Pivot_Dataset_HighlightStatusField', [
                getCrossHighlightFieldBaseMeasureName(column),
                getI18nValue('Pivot_Debug_HighlightStatusNeutral'),
                getI18nValue('Pivot_Debug_HighlightStatusOn'),
                getI18nValue('Pivot_Debug_HighlightStatusOff'),
                getI18nValue('Pivot_Debug_Refer_Documentation')
            ]);
        case isCrossHighlightField(column):
            return getI18nValue('Pivot_Dataset_HighlightField', [
                getCrossHighlightFieldBaseMeasureName(column)
            ]);
        default:
            return column;
    }
};

/**
 * We need to measure how much space a table value (and heading) will take up
 * in the UI, so that we can pre-calculate the width of each column. This is
 * computationally expensive, to do by value, so with a monospace font, we can
 * measure this once, and project by the number of characters in the supplied
 * value. This method measures the width of a single character, based on font
 * size and family.
 *
 * @privateRemarks `OffScreenCanvas` is not supported in Safari until 16.2, and
 * MS currently tests on 16.1, so we need to handle falling back if we can't
 * use it. As we have the formattingutils loaded, we'll use their method.
 */
export const getDataTableRenderedCharWidth = () => {
    const textToMeasure = '-'; // MS APIs strip whitespace
    if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(100, 10);
        const ctx: OffscreenCanvasRenderingContext2D = <any>(
            canvas.getContext('2d')
        );
        ctx.font = `${DATA_TABLE_FONT_SIZE}px ${DATA_TABLE_FONT_FAMILY}`;
        return ctx.measureText(textToMeasure).width;
    } else {
        return textMeasurementService.measureSvgTextRect({
            text: textToMeasure,
            fontFamily: DATA_TABLE_FONT_FAMILY,
            fontSize: `${DATA_TABLE_FONT_SIZE}px`
        }).width;
    }
};

/**
 * Perform all i18n translations for values that need to be assigned by the
 * data table worker.
 */
export const getDataTableWorkerTranslations =
    (): IWorkerDatasetViewerTranslations => ({
        placeholderInfinity: getI18nValue('Table_Placeholder_Infinity'),
        placeholderNaN: getI18nValue('Table_Placeholder_NaN'),
        placeholderTooLong: getI18nValue('Table_Placeholder_TooLong'),
        selectedNeutral: getI18nValue('Pivot_Debug_SelectedNeutral'),
        selectedOn: getI18nValue('Pivot_Debug_SelectedOn'),
        selectedOff: getI18nValue('Pivot_Debug_SelectedOff'),
        selectionKeywordPresent: getI18nValue('Selection_KW_Present')
    });

/**
 * If a column name is a reserved word, then supply a suitable tooltip value.
 */
const getReservedTableColumnTooltip = (field: string) => {
    switch (true) {
        case field === SELECTED_ROW_FIELD_NAME:
            return getI18nValue('Pivot_Dataset_SelectedName', [
                field,
                getI18nValue('Pivot_Debug_SelectedNeutral'),
                getI18nValue('Pivot_Debug_SelectedOn'),
                getI18nValue('Pivot_Debug_SelectedOff'),
                getI18nValue('Pivot_Debug_Refer_Documentation')
            ]);
        default:
            return getI18nValue(
                `Pivot_Dataset_${
                    field === ROW_INDEX_FIELD_NAME
                        ? 'RowIdentifier'
                        : field === ROW_IDENTITY_FIELD_NAME
                          ? 'IdentityName'
                          : 'Unknown'
                }`,
                [field]
            );
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
 * Handle the processing of a stringified value within a data table.
 */
const getStringifiedDisplayValue = (value: any, tooltip = false) => {
    const pruned = getPrunedObject(value);
    return tooltip ? getSanitisedTooltipValue(pruned) : pruned;
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

/**
 * For a given column value, determine if it's in the list of 'reserved' words
 * that should be processed differently.
 */
const isTableColumnNameReserved = (value: string) =>
    TABLE_COLUMN_RESERVED_WORDS.indexOf(value) > -1;
