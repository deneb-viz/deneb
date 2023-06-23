import { isDate, isFunction, isNumber } from 'vega';
import { IStackItemStyles } from '@fluentui/react/lib/Stack';

import {
    DATASET_IDENTITY_NAME,
    DATASET_ROW_NAME,
    DATASET_SELECTED_NAME,
    TABLE_COLUMN_RESERVED_WORDS
} from '../../constants';
import { IDataTableWorkerTranslations } from './types';
import { i18nValue } from '../../core/ui/i18n';
import { getPrunedObject, stringifyPruned } from '../../core/utils/json';
import {
    getCrossHighlightFieldBaseMeasureName,
    getSanitisedTooltipValue,
    isCrossHighlightComparatorField,
    isCrossHighlightField,
    isCrossHighlightStatusField,
    TDataPointHighlightComparator,
    TDataPointHighlightStatus,
    TDataPointSelectionStatus
} from '../interactivity';
import { DATA_TABLE_FONT_FAMILY, DATA_TABLE_FONT_SIZE } from '.';

/**
 * This sets the StackItem for the table to the correct positioning for
 * Tabulator.
 */
export const dataTableStackItemStyles: Partial<IStackItemStyles> = {
    root: { position: 'relative' }
};

/**
 * If the column/cell relates to cross-filtering, return a tooltip value that
 * is contextual for the displayed value.
 */
const getCellCrossFilterTooltip = (value: TDataPointSelectionStatus) => {
    switch (value) {
        case 'neutral':
            return i18nValue('Pivot_Debug_SelectedNeutral');
        case 'on':
            return i18nValue('Pivot_Debug_SelectedOn');
        case 'off':
            return i18nValue('Pivot_Debug_SelectedOff');
    }
};

/**
 * For a given column, checks for any special conditions and returns a
 * customized tooltip for the current cell.
 */
export const getCellTooltip = (field: string, value: any) => {
    switch (true) {
        case field === DATASET_SELECTED_NAME:
            return getCellCrossFilterTooltip(value);
        case isCrossHighlightComparatorField(field):
            return getCellHighlightComparatorTooltip(value);
        case isCrossHighlightStatusField(field):
            return getCellHighlightComparatorStatus(value);
        case isValuePlaceholderComplex(value):
            return i18nValue('Table_Tooltip_TooLong');
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
const getCellHighlightComparatorStatus = (value: TDataPointHighlightStatus) => {
    switch (value) {
        case 'neutral':
            return i18nValue('Pivot_Debug_HighlightStatusNeutral');
        case 'on':
            return i18nValue('Pivot_Debug_HighlightStatusOn');
        case 'off':
            return i18nValue('Pivot_Debug_HighlightStatusOff');
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
            return i18nValue('Pivot_Debug_HighlightComparatorEq');
        case 'lt':
            return i18nValue('Pivot_Debug_HighlightComparatorLt');
        case 'gt':
            return i18nValue('Pivot_Debug_HighlightComparatorGt');
        case 'neq':
            return i18nValue('Pivot_Debug_HighlightComparatorNeq');
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
            return i18nValue('Pivot_Dataset_HighlightComparatorField', [
                getCrossHighlightFieldBaseMeasureName(column),
                i18nValue('Pivot_Debug_HighlightComparatorEq'),
                i18nValue('Pivot_Debug_HighlightComparatorLt'),
                i18nValue('Pivot_Debug_HighlightComparatorGt'),
                i18nValue('Pivot_Debug_HighlightComparatorNeq'),
                i18nValue('Pivot_Debug_Refer_Documentation')
            ]);
        case isCrossHighlightStatusField(column):
            return i18nValue('Pivot_Dataset_HighlightStatusField', [
                getCrossHighlightFieldBaseMeasureName(column),
                i18nValue('Pivot_Debug_HighlightStatusNeutral'),
                i18nValue('Pivot_Debug_HighlightStatusOn'),
                i18nValue('Pivot_Debug_HighlightStatusOff'),
                i18nValue('Pivot_Debug_Refer_Documentation')
            ]);
        case isCrossHighlightField(column):
            return i18nValue('Pivot_Dataset_HighlightField', [
                getCrossHighlightFieldBaseMeasureName(column)
            ]);
        default:
            return column;
    }
};

/**
 * When posting to the web worker, we need to ensure that our dataset is
 * suffciently pruned to avoid any issues with cyclic references, or properties
 * that can cause issues with serialization.
 */
export const getDatasetForWorker = (dataset: any[]) =>
    JSON.parse(JSON.stringify(dataset, getPrunedObject(3)));

/**
 * We need to measure how much space a table value (and heading) will take up
 * in the UI, so that we can pre-calculate the width of each column. This is
 * computationally expensive, to do by value, so with a monospace font, we can
 * measure this once, and project by the number of characters in the supplied
 * value. This method measures the width of a single character, based on font
 * size and family.
 */
export const getDataTableRenderedCharWidth = () => {
    const canvas = new OffscreenCanvas(100, 10);
    const ctx: OffscreenCanvasRenderingContext2D = <any>canvas.getContext('2d');
    ctx.font = `${DATA_TABLE_FONT_SIZE}px ${DATA_TABLE_FONT_FAMILY}`;
    return ctx.measureText(' ').width;
};

/**
 * Perform all i18n translations for values that need to be assigned by the
 * data table worker.
 */
export const getDataTableWorkerTranslations =
    (): IDataTableWorkerTranslations => ({
        placeholderInfinity: i18nValue('Table_Placeholder_Infinity'),
        placeholderNaN: i18nValue('Table_Placeholder_NaN'),
        placeholderTooLong: i18nValue('Table_Placeholder_TooLong'),
        selectedNeutral: i18nValue('Pivot_Debug_SelectedNeutral'),
        selectedOn: i18nValue('Pivot_Debug_SelectedOn'),
        selectedOff: i18nValue('Pivot_Debug_SelectedOff'),
        selectionKeywordPresent: i18nValue('Selection_KW_Present')
    });

/**
 * If a column name is a reserved word, then supply a suitable tooltip value.
 */
const getReservedTableColumnTooltip = (field: string) => {
    switch (true) {
        case field === DATASET_SELECTED_NAME:
            return i18nValue('Pivot_Dataset_SelectedName', [
                field,
                i18nValue('Pivot_Debug_SelectedNeutral'),
                i18nValue('Pivot_Debug_SelectedOn'),
                i18nValue('Pivot_Debug_SelectedOff'),
                i18nValue('Pivot_Debug_Refer_Documentation')
            ]);
        default:
            return i18nValue(
                `Pivot_Dataset_${
                    field === DATASET_ROW_NAME
                        ? 'RowIdentifier'
                        : field === DATASET_IDENTITY_NAME
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
        ? i18nValue('Table_Placeholder_NaN')
        : value === Number.POSITIVE_INFINITY
        ? i18nValue('Table_Placeholder_Infinity')
        : value === Number.NEGATIVE_INFINITY
        ? `-${i18nValue('Table_Placeholder_Infinity')}`
        : getStringifiedDisplayValue(value, tooltip);

/**
 * Handle the processing of a stringified value within a data table.
 */
const getStringifiedDisplayValue = (value: any, tooltip = false) => {
    const pruned = stringifyPruned(value);
    return tooltip ? getSanitisedTooltipValue(JSON.parse(pruned)) : pruned;
};

/**
 * Determines whether a supplied value matches one of the 'placeholder' values
 * for a table cell.
 */
const isValuePlaceholderComplex = (value: string) =>
    value === i18nValue('Table_Placeholder_TooLong') ||
    value === i18nValue('Table_Placeholder_Object') ||
    value === i18nValue('Table_Placeholder_Circular') ||
    false;

/**
 * For a given column value, determine if it's in the list of 'reserved' words
 * that should be processed differently.
 */
const isTableColumnNameReserved = (value: string) =>
    TABLE_COLUMN_RESERVED_WORDS.indexOf(value) > -1;
