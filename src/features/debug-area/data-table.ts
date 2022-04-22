import { isDate, isFunction } from 'vega';
import { IStackItemStyles } from '@fluentui/react/lib/Stack';
import { Tabulator } from 'react-tabulator/lib/types/TabulatorTypes';
import CellComponent = Tabulator.CellComponent;
import ColumnComponent = Tabulator.ColumnComponent;

import {
    DATASET_IDENTITY_NAME,
    DATASET_ROW_NAME,
    DATASET_SELECTED_NAME,
    TABLE_COLUMN_RESERVED_WORDS,
    TABLE_VALUE_MAX_LENGTH
} from '../../constants';
import { ITableFormattedValue } from './types';
import { i18nValue } from '../../core/ui/i18n';
import { stringifyPruned } from '../../core/utils/json';

/**
 * This sets the StackItem for the table to the correct positioning for
 * Tabulator.
 */
export const dataTableStackItemStyles: Partial<IStackItemStyles> = {
    root: { position: 'relative' }
};

/**
 * For a given column, checks for any special conditions and returns a
 * customized tooltip for the column header.
 */
export const getColumnHeaderTooltip = (column: ColumnComponent) => {
    const { field } = column.getDefinition();
    switch (true) {
        case isTableColumnNameReserved(field):
            return getReservedTableColumnTooltip(field);
        default:
            return field;
    }
};

/**
 * For a given column, checks for any special conditions and returns a
 * customized tooltip for the current cell.
 */
export const getColumnTooltip = (cell: CellComponent) => {
    const field = cell.getColumn().getField();
    const value = cell.getValue();
    switch (true) {
        case field === DATASET_SELECTED_NAME:
            return 'bleh';
        case isValuePlaceholderComplex(value):
            return i18nValue('Table_Tooltip_TooLong');
        default:
            return value;
    }
};

/**
 * For a provided value, format it for display in a table in the preview
 * toolbar pane. Borrowed and adapted from vega-editor.
 */
export const getFormattedValueForTable = (cell: CellComponent) => {
    const value = cell?.getValue();
    const column = cell?.getColumn().getField();
    let formattedValue: ITableFormattedValue = {
        formatted: '',
        tooLong: false
    };
    if (!isDate(value)) {
        formattedValue = formatLongValueForTable(value);
    } else {
        formattedValue = {
            ...formattedValue,
            ...{ formatted: new Date(value).toUTCString() }
        };
    }
    return formattedValue.tooLong
        ? i18nValue('Table_Placeholder_TooLong')
        : formattedValue.formatted;
};

/**
 * If a column name is a reserved word, then supply a suitable tooltip value.
 */
const getReservedTableColumnTooltip = (field: string) =>
    i18nValue(
        `Pivot_Dataset_${
            field === DATASET_ROW_NAME
                ? 'RowIdentifier'
                : field === DATASET_SELECTED_NAME
                ? 'SelectedName'
                : field === DATASET_IDENTITY_NAME
                ? 'IdentityName'
                : 'Unknown'
        }`,
        [field]
    );

/**
 * Handle the display and translation of number values for a table. Borrowed
 * and adapted from vega-editor.
 */
const formatNumberValueForTable = (value: number) =>
    isNaN(value)
        ? i18nValue('Table_Placeholder_NaN')
        : value === Number.POSITIVE_INFINITY
        ? i18nValue('Table_Placeholder_Infinity')
        : value === Number.NEGATIVE_INFINITY
        ? `-${i18nValue('Table_Placeholder_Infinity')}`
        : stringifyPruned(value);

/**
 * Handle the display and/or truncation of a values for display in a table.
 * Borrowed and adapted from vega-editor.
 */
const formatLongValueForTable = (value: any): ITableFormattedValue => {
    const formatted =
        value === undefined
            ? 'undefined'
            : typeof value == 'number'
            ? formatNumberValueForTable(value)
            : isFunction(value)
            ? value.toString()
            : stringifyPruned(value);
    if (formatted.length > TABLE_VALUE_MAX_LENGTH) {
        return { formatted: null, tooLong: true };
    }
    return { formatted, tooLong: false };
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
