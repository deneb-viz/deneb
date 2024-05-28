/**
 * Represents the worker that processes the dataset for display in the debug pane.
 */
export interface IWorkerDatasetViewer
    extends Omit<Worker, 'onmessage,postMessage'> {
    onmessage:
        | ((
              this: Worker,
              ev: MessageEvent<IWorkerDatasetViewerResponse>
          ) => any)
        | null;
    postMessage(message: IWorkerDatasetViewerMessage): void;
}

/**
 * Pre-computed i18n translations for the data table worker, as these cannot be done dynamically (due to not being
 * able to share methods between main thread and worker).
 */
export interface IWorkerDatasetViewerTranslations {
    placeholderInfinity: string;
    placeholderNaN: string;
    placeholderTooLong: string;
    selectionKeywordPresent: string;
    selectedNeutral: string;
    selectedOn: string;
    selectedOff: string;
}

/**
 * Represents the message sent to the data table worker from the main thread, whenever the displayed dataset in the
 * table changes and needs re-processing.
 */
export interface IWorkerDatasetViewerMessage {
    canvasFontCharWidth: number;
    dataset: Record<string, unknown>[];
    datasetKeyName: string;
    jobId: string;
    translations: IWorkerDatasetViewerTranslations;
    valueMaxLength: number;
}

/**
 * Represents the response from the data table worker to the main thread.
 */
export interface IWorkerDatasetViewerResponse {
    jobId: string;
    maxWidths: IWorkerDatasetViewerMaxDisplayWidths;
    shouldProcess: boolean;
    values: IWorkerDatasetViewerDataTableRow[];
}

/**
 * Key/value pairs of field names and their max computed display widths.
 */
export interface IWorkerDatasetViewerMaxDisplayWidths {
    [key: string]: number;
}

/**
 * Represents a processed table row, ready for display in the debug data table.
 */
export interface IWorkerDatasetViewerDataTableRow {
    [key: string]: IWorkerDatasetViewerDataTableFormattedValue;
}

/**
 * Tracks how a table value should be formatted when working out cell content.
 */
export interface IWorkerDatasetViewerDataTableFormattedValue {
    displayValue: string;
    displayWidth: number;
    formattedValue: string;
    rawValue: unknown;
    tooLong: boolean;
    valueType: WorkerDatasetViewerValueType;
}

/**
 * Represents the type of value in a debug area table cell. This is used to determine how to format the value for
 * display, or other additional logic.
 */
export type WorkerDatasetViewerValueType =
    | 'invalid'
    | 'number'
    | 'date'
    | 'object'
    | 'string'
    | 'boolean'
    | 'key';
