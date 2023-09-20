/**
 * For the data table, we have some costly processes that we don't want to
 * block the main thread for. This worker is used to perform those processes
 * in a separate thread.
 *
 * @privateRemarks This is a separate file so that it can be bundled into a
 * separate worker bundle, which is then loaded as a blob URL, due to
 * limitations with custom visuals. We can't easily import methods from other
 * APIs, so we need to keep this very self-contained.
 */

import {
    DebugAreaValueType,
    IDataTableWorkerMessage,
    IDataTableRow,
    IDataTableWorkerTranslations,
    IDataTableWorkerResponse,
    IDataTableWorkerMaxDisplayWidths
} from './types';

/**
 * Web worker used to process dataset viewer table content in a separate
 * thread, so that we don't block the main thread.
 */
// eslint-disable-next-line max-lines-per-function
const dataTableWorker = () => {
    /**
     * Used to memoize the calculated width of a given string, so that we don't
     * have to re-compute each time.
     */
    const widthCache: { [key: string]: number } = {};

    /**
     * Handle dataset processing requests from the main thread.
     */
    self.onmessage = (e: MessageEvent<IDataTableWorkerMessage>) => {
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
        if (length in widthCache) {
            return widthCache[length];
        } else {
            const result = length * canvasFontCharWidth;
            widthCache[length] = result;
            return result;
        }
    };

    /**
     * Do any specific formatting for the value, based on the type.
     *
     * @privateRemarks This was previously mostly used to handle the
     * 'redaction' internal values, but because this is common to tooltips
     * also, this is done in the main thread now (as we can't share the logic
     * between the two).
     */
    const getFormattedValueForTableCell = (
        getValueType: DebugAreaValueType,
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
     * Process each field and value, doing the formatting, truncation and
     * measuring of the output in a single pass.
     *
     * @privateRemarks this was what was blocking the main thread and
     * represents the lion's share of the work being done.
     */
    const getProcessedData = (
        data: IDataTableWorkerMessage
    ): IDataTableWorkerResponse => {
        const maxWidths: IDataTableWorkerMaxDisplayWidths = {};
        const values: IDataTableRow[] = data.dataset.map((d) => {
            const allKeys = Object.keys(d);
            return allKeys.reduce((acc, key) => {
                const value = d[key];
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
            }, <IDataTableRow>{});
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
     * @privateRemarks note that objects have already been pruned for depth
     * and circular references prior to being posted to the worker (due to
     * `postMessage` limitations), so they are returned as-is.
     */
    const getRawValueForTableCell = (
        valueType: DebugAreaValueType,
        value: unknown,
        translations: IDataTableWorkerTranslations
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
     * We will need to handle specific types of values in the table, so this
     * method will determine and flag as appropriate.
     */
    const getValueType = (
        key: string,
        value: unknown,
        datasetKeyName: string
    ): DebugAreaValueType => {
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

    /**
     * Tests for boolean type compatibility.
     */
    const isBoolean = (_: unknown) => typeof _ === 'boolean';

    /**
     * Tests for date type compatibility.
     */
    const isDate = (_: unknown) =>
        Object.prototype.toString.call(_) === '[object Date]';

    /**
     * Tests for number type compatibility.
     */
    const isNumber = (_: unknown) => typeof _ === 'number';

    /**
     * Tests for object type compatibility.
     */
    const isObject = (_: unknown) => typeof _ === 'object';

    /**
     * Tests for string type compatibility.
     */
    const isString = (_: unknown) => typeof _ === 'string';
};

/**
 * Creates a Blob-based URL for the data table worker, so that it can be
 * lazy-loaded within a custom visual without having to deal with an external
 * URL.
 */
const DATA_TABLE_WORKER_URL = URL.createObjectURL(
    new Blob([`(${dataTableWorker.toString()})()`], {
        type: 'text/javascript'
    })
);

/**
 * Instantiates a new data table worker.
 */
export const getDataTableWorker = () => new Worker(DATA_TABLE_WORKER_URL);
