export interface ILogEntry {
    level: number;
    message: string;
}

export interface ILogEntryDisplay extends ILogEntry {
    i18nLevel: string;
    icon: string;
    color: string;
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
