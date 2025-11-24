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
 * Represents a row of data in the table for presenting signals and values.
 */
export interface ISignalTableDataRow {
    key: string;
    value: any;
}
