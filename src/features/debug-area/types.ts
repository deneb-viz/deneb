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
 * Represents the type of value in a debug area table cell. This is used to
 * determine how to format the value for display, or other additional logic.
 */
export type DebugAreaValueType =
    | 'invalid'
    | 'number'
    | 'date'
    | 'object'
    | 'string'
    | 'boolean'
    | 'key';

/**
 * Pre-computed i18n translations for the data table worker, as these cannot
 * be done dynamically (due to not being able to share methods between main
 * thread and worker).
 */
export interface IDataTableWorkerTranslations {
    placeholderInfinity: string;
    placeholderNaN: string;
    placeholderTooLong: string;
    selectionKeywordPresent: string;
    selectedNeutral: string;
    selectedOn: string;
    selectedOff: string;
}

/**
 * Represents the message sent to the data table worker from the main thread,
 * whenever the displayed dataset in the table changes and needs re-processing.
 */
export interface IDataTableWorkerMessage {
    canvasFontCharWidth: number;
    dataset: Record<string, unknown>[];
    datasetKeyName: string;
    jobId: string;
    translations: IDataTableWorkerTranslations;
    valueMaxLength: number;
}

/**
 * Represents the response from the data table worker to the main thread.
 */
export interface IDataTableWorkerResponse {
    jobId: string;
    maxWidths: IDataTableWorkerMaxDisplayWidths;
    shouldProcess: boolean;
    values: IDataTableRow[];
}

/**
 * Key/value pairs of field names and their max computed display widths.
 */
export interface IDataTableWorkerMaxDisplayWidths {
    [key: string]: number;
}

/**
 * Represents a processed table row, ready for display in the debug data table.
 */
export interface IDataTableRow {
    [key: string]: IDataTableFormattedValue;
}

/**
 * Tracks how a table value should be formatted when working out cell content.
 */
export interface IDataTableFormattedValue {
    displayValue: string;
    displayWidth: number;
    formattedValue: string;
    rawValue: unknown;
    tooLong: boolean;
    valueType: DebugAreaValueType;
}

/**
 * Represents a row of data in the table for presenting signals and values.
 */
export interface ISignalTableDataRow {
    key: string;
    value: any;
}
