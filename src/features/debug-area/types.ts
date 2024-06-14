export interface ILogEntry {
    level: number;
    message: string;
}

export interface ILogEntryDisplay extends ILogEntry {
    i18nLevel: string;
}

export interface ILogLevel {
    level: number;
    i18n: string;
}

/**
 * Tracks how a table value should be formatted when working out cell content.
 */
export interface ITableFormattedValue {
    formatted: string;
    tooLong: boolean;
}

/**
 * Specifes navigation operations on the data table. We can use this as a
 * property in a generic component to handle repetitive code.
 */
export type DataTableNavigationType = 'first' | 'last' | 'next' | 'previous';

/**
 * Represents a row of data in the table for presenting signals and values.
 */
export interface ISignalTableDataRow {
    key: string;
    value: any;
}
