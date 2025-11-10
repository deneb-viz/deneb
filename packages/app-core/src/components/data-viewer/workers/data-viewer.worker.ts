import type {
    IWorkerDatasetViewerDataTableRow,
    IWorkerDatasetViewerMaxDisplayWidths,
    IWorkerDatasetViewerMessage,
    IWorkerDatasetViewerResponse,
    IWorkerDatasetViewerTranslations,
    WorkerDatasetViewerValueType
} from './types';
import {
    isDate,
    isNumber,
    isObject,
    isBoolean,
    isString
} from '@deneb-viz/utils/inspection';

/**
 * Used to memoize the calculated width of a given string, so that we don't have to re-compute each time.
 */
const WIDTH_CACHE: { [key: string]: number } = {};

/**
 * Handle dataset processing requests from the main thread.
 */
self.onmessage = (e: MessageEvent<IWorkerDatasetViewerMessage>) => {
    self.postMessage(getProcessedData(e.data));
};

/**
 * Calculate and memoize the display width of a display value.
 */
const getDisplayWidth = (
    value: string,
    canvasFontCharWidth: number
): number => {
    const length = `${value}`.length || 0;
    if (length in WIDTH_CACHE) {
        return WIDTH_CACHE[length] ?? 0;
    } else {
        const result = length * canvasFontCharWidth;
        WIDTH_CACHE[length] = result;
        return result;
    }
};

/**
 * Do any specific formatting for the value, based on the type.
 *
 * @privateRemarks This was previously mostly used to handle the 'redaction' internal values, but because this is
 * common to tooltips also, this is done in the main thread now (as we can't share the logic between the two).
 */
const getFormattedValueForTableCell = (
    getValueType: WorkerDatasetViewerValueType,
    value: unknown
): string => {
    switch (getValueType) {
        case 'date':
            return (<Date>value).toLocaleString();
        case 'object':
            return JSON.stringify(value);
        default:
            return `${value}`;
    }
};

/**
 * Process each field and value, doing the formatting, truncation and measuring of the output in a single pass.
 *
 * @privateRemarks this was what was blocking the main thread and represents the lion's share of the work being done.
 */
const getProcessedData = (
    data: IWorkerDatasetViewerMessage
): IWorkerDatasetViewerResponse => {
    const maxWidths: IWorkerDatasetViewerMaxDisplayWidths = {};
    const values: IWorkerDatasetViewerDataTableRow[] = data.dataset.map((d) => {
        // If our sanitized datum prior to sending is empty, we need to add a placeholder
        const newDatum: Record<string, unknown> =
            Object.keys(d).length === 0 ? { datum: {} } : { ...d };
        const allKeys = Object.keys(newDatum);
        const result = allKeys.reduce(
            (acc, key) => {
                const value = newDatum[key];
                const valueType = getValueType(key, value, data.datasetKeyName);
                const rawValue = getRawValueForTableCell(
                    valueType,
                    value,
                    data.translations
                );
                const formattedValue = getFormattedValueForTableCell(
                    valueType,
                    rawValue
                );
                const tooLong =
                    `${formattedValue}`.length > data.valueMaxLength;
                const displayValue = tooLong
                    ? data.translations.placeholderTooLong
                    : formattedValue;
                const displayWidth = getDisplayWidth(
                    displayValue,
                    data.canvasFontCharWidth
                );
                maxWidths[key] = Math.max(maxWidths[key] || 0, displayWidth);
                return {
                    ...acc,
                    [key]: {
                        rawValue,
                        displayValue,
                        displayWidth,
                        formattedValue,
                        tooLong,
                        valueType
                    }
                };
            },
            <IWorkerDatasetViewerDataTableRow>{}
        );
        return result;
    });
    return {
        jobId: data.jobId,
        maxWidths,
        shouldProcess: true,
        values
    };
};

/**
 * Process the raw value for a table cell, based on the type.
 *
 * @privateRemarks note that objects have already been pruned for depth and circular references prior to being posted
 * to the worker (due to `postMessage` limitations), so they are returned as-is.
 */
const getRawValueForTableCell = (
    valueType: WorkerDatasetViewerValueType,
    value: unknown,
    translations: IWorkerDatasetViewerTranslations
): unknown => {
    switch (valueType) {
        case 'key':
            return translations.selectionKeywordPresent;
        case 'date':
            return new Date(<string | number>value);
        default:
            return value;
    }
};

/**
 * We will need to handle specific types of values in the table, so this method will determine and flag as appropriate.
 */
const getValueType = (
    key: string,
    value: unknown,
    datasetKeyName: string
): WorkerDatasetViewerValueType => {
    switch (true) {
        case key === datasetKeyName:
            return 'key';
        case isDate(value):
            return 'date';
        case isNumber(value):
            return 'number';
        case isObject(value):
            return 'object';
        case isBoolean(value):
            return 'boolean';
        case isString(value):
            return 'string';
        default:
            return 'invalid';
    }
};
