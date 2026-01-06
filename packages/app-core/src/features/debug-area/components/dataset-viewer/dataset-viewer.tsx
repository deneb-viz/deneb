import { useCallback, useEffect, useMemo, useState } from 'react';
import { TableColumn, TableProps } from 'react-data-table-component';
import { useDebounce } from '@uidotdev/usehooks';
import { textMeasurementService } from 'powerbi-visuals-utils-formattingutils';

import { getHashValue, getNewUuid } from '@deneb-viz/utils/crypto';
import {
    logDebug,
    logRender,
    logTimeEnd,
    logTimeStart
} from '@deneb-viz/utils/logging';
import { getPrunedObject } from '@deneb-viz/utils/object';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { type DatasetRaw, type DatasetState } from './types';
import {
    datasetViewerWorker,
    IWorkerDatasetViewerDataTableRow,
    IWorkerDatasetViewerMaxDisplayWidths,
    IWorkerDatasetViewerTranslations,
    type IWorkerDatasetViewerMessage
} from '../../workers';
import {
    DATA_TABLE_COLUMN_RESERVED_WORDS,
    DATA_TABLE_FONT_FAMILY,
    DATA_TABLE_FONT_SIZE,
    DATA_TABLE_VALUE_MAX_DEPTH,
    DATA_TABLE_VALUE_MAX_LENGTH
} from '../../constants';
import { DataTableCell } from '../data-table/data-table-cell';
import { getDenebState, useDenebState } from '../../../../state';
import { NoDataMessage } from '../no-data-message';
import { DataTableViewer } from '../data-table/data-table';
import { ProcessingDataMessage } from '../data-table/processing-data-message';
import { type VegaDatum } from '@deneb-viz/data-core/value';
import {
    getCrossHighlightFieldBaseMeasureName,
    isCrossHighlightComparatorField,
    isCrossHighlightField,
    isCrossHighlightStatusField,
    ROW_INDEX_FIELD_NAME,
    SELECTED_ROW_FIELD_NAME
} from '@deneb-viz/data-core/field';
import { useDebugWrapperStyles } from '../styles';

type DatasetViewerProps = {
    datasetName: string;
    logAttention: boolean;
    renderId: string;
};

const DATA_LISTENER_DEBOUNCE_INTERVAL = 100;

/**
 * Handles display of dataset details for the current Vega view.
 */
// eslint-disable-next-line max-lines-per-function
export const DatasetViewer = ({
    datasetName,
    logAttention,
    renderId
}: DatasetViewerProps) => {
    const [sortColumnId, setSortColumnId] = useState<string | number | null>(
        null
    );
    const [sortAsc, setSortAsc] = useState(false);
    const [datasetRaw, setDatasetRaw] = useState<DatasetRaw>({
        hashValue: null,
        values: []
    });
    const [datasetRawPending, setDatasetRawPending] = useState<DatasetRaw>({
        hashValue: null,
        values: []
    });
    const debouncedDatasetRaw = useDebounce(
        datasetRawPending,
        DATA_LISTENER_DEBOUNCE_INTERVAL
    );
    const [datasetState, setDatasetState] = useState<DatasetState>({
        columns: null,
        jobQueue: [],
        processing: true,
        values: null
    });
    const datasetWorker = useMemo(() => datasetViewerWorker, []);
    const { logError } = useDenebState((state) => ({
        logError: state.specification.logError
    }));
    /**
     * When our dataset changes, we need to send it to our web worker for
     * processing.
     */
    useEffect(() => {
        logDebug('DatasetViewer: updating dataset state...');
        if (window.Worker && datasetRaw) {
            const jobId = getNewUuid();
            setDatasetState((datasetState) => ({
                ...datasetState,
                jobQueue: [...datasetState.jobQueue, jobId],
                processing: true
            }));
            logDebug('DatasetViewer: using worker...', {
                datasetState
            });
            /**
             * We have to fix/prune a dataset prior to sending to the worker,
             * as postMessage gets upset about cyclics and methods.
             */
            const message: IWorkerDatasetViewerMessage = {
                canvasFontCharWidth: getDataTableRenderedCharWidth(),
                dataset: datasetRaw.values,
                jobId,
                translations: getDataTableWorkerTranslations(),
                valueMaxLength: DATA_TABLE_VALUE_MAX_LENGTH
            };
            datasetWorker.postMessage(message);
            logDebug('DatasetViewer: worker message sent');
        }
    }, [datasetRaw.hashValue]);
    /**
     * When we get a response from our worker, we need to update our state
     * with the processed data table output.
     */
    useEffect(() => {
        if (window.Worker) {
            datasetWorker.onmessage = (e) => {
                const { jobId, values, maxWidths } = e.data;
                logDebug('DatasetViewer: worker response received', {
                    jobId,
                    values,
                    datasetRaw,
                    datasetState
                });
                const columns = getTableColumns(values, maxWidths);
                const { jobQueue } = datasetState;
                const newJobQueue = jobQueue.filter((id) => id !== jobId);
                const complete = newJobQueue.length === 0;
                logDebug('DatasetViewer: job queue status', {
                    prev: jobQueue,
                    next: newJobQueue,
                    complete
                });
                setDatasetState(() => ({
                    columns,
                    jobQueue: newJobQueue,
                    processing: !complete,
                    values
                }));
            };
        }
    }, [datasetWorker]);
    /**
     * Attempt to add specified data listener to the Vega view.
     */
    const addListener = () => {
        try {
            logDebug(
                `DatasetViewer: attempting to add listener for dataset [${datasetName}]...`
            );
            VegaViewServices.getView()?.addDataListener(
                datasetName,
                dataListener
            );
            logDebug(
                `DatasetViewer: listener for dataset [${datasetName}] added.`
            );
        } catch {
            logDebug(
                `DatasetViewer: listener for dataset [${datasetName}] could not be added.`
            );
        }
    };
    /**
     * Attempt to remove specified data listener from the Vega view.
     */
    const removeListener = () => {
        try {
            logDebug(
                `DatasetViewer: attempting to remove listener for dataset [${datasetName}]...`
            );
            VegaViewServices.getView()?.removeDataListener(
                datasetName,
                dataListener
            );
            logDebug(
                `DatasetViewer: listener for dataset [${datasetName}] removed.`
            );
        } catch {
            logDebug(
                `DatasetViewer: listener for dataset [${datasetName}] could not be removed.`
            );
        }
    };
    /**
     * Attempt to cycle (add/remove) listeners for the specified dataset.
     */
    const cycleListeners = () => {
        logDebug(
            `DatasetViewer: cycling listeners for dataset: [${datasetName}]...`
        );
        removeListener();
        addListener();
    };
    /**
     * Sync debounced value to actual state.
     */
    useEffect(() => {
        if (debouncedDatasetRaw.hashValue !== datasetRaw.hashValue) {
            setDatasetRaw(debouncedDatasetRaw);
        }
    }, [debouncedDatasetRaw]);
    /**
     * Handler for dataset listener events.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataListener = useCallback((name: string, value: any) => {
        logDebug(
            `DatasetViewer: [${renderId}] dataset ${name} has changed`,
            value
        );
        const newDataset = getPrunedObject(value);
        const hashValue = getDataHash(newDataset);
        setDatasetRawPending(() => ({
            hashValue,
            values: newDataset
        }));
    }, []);
    /**
     * Ensure that listener is added/removed when the data might change.
     */
    useEffect(() => {
        try {
            logDebug(
                `DatasetViewer: getting latest dataset from view (${datasetName})...`
            );
            const datasetView = getDatasetValues(datasetName, logAttention);
            logDebug(
                `DatasetViewer: dataset from view (${datasetName})`,
                datasetView
            );
            const datasetForHash = getPrunedObject(datasetView, {
                maxDepth: DATA_TABLE_VALUE_MAX_DEPTH
            });
            logDebug(
                `DatasetViewer: latest dataset retrieved (${datasetName})`,
                {
                    latest: datasetForHash
                }
            );
            logDebug(
                `DatasetViewer: calculating latest dataset hash (${datasetName})...`
            );
            const latestHash = getDataHash(datasetForHash);
            logDebug(
                `DatasetViewer: latest dataset hash calculated (${datasetName})`,
                {
                    latestHash
                }
            );
            const latestDatasetRaw: DatasetRaw = {
                values: datasetForHash,
                hashValue: latestHash
            };
            logDebug('DataSetViewer: checking for dataset change...', {
                datasetName,
                datasetRaw,
                latestDatasetRaw
            });
            if (latestHash != datasetRaw?.hashValue) {
                logDebug(
                    `DatasetViewer: change necessitates dataset update. Updating...`,
                    {
                        datasetName,
                        renderId,
                        logAttention
                    }
                );
                setDatasetRaw(() => latestDatasetRaw);
                cycleListeners();
            } else {
                logDebug(
                    `DatasetViewer: no change detected. Skipping dataset update.`
                );
            }
        } catch (e) {
            logDebug(`DatasetViewer: error getting latest dataset from view.`, {
                e
            });
            logError(
                `Failed to load dataset [${datasetName}] from view. Error details: ${(e as Error).message}`
            );
        }
        return () => {
            removeListener();
        };
    }, [datasetName, renderId, logAttention]);
    /**
     * Keep sort persisted across renders.
     */
    const handleSort: TableProps<
        IWorkerDatasetViewerDataTableRow[]
    >['onSort'] = (column, sortDirection) => {
        logDebug('DatasetViewer: setting sort columns...', {
            column,
            sortDirection
        });
        setSortColumnId(column?.id ?? null);
        setSortAsc(() => sortDirection === 'asc');
    };
    const classes = useDebugWrapperStyles();
    logRender('DatasetViewer', {
        datasetState,
        datasetRaw,
        renderId,
        logAttention,
        sortColumnId,
        sortAsc
    });
    return datasetState.processing ? (
        <ProcessingDataMessage />
    ) : datasetState.values?.length ? (
        <div className={classes.container}>
            <div className={classes.wrapper}>
                <div className={classes.details}>
                    <DataTableViewer
                        columns={datasetState.columns ?? []}
                        data={datasetState.values}
                        defaultSortFieldId={sortColumnId}
                        defaultSortAsc={sortAsc}
                        onSort={handleSort}
                        progressPending={datasetState.processing}
                    />
                </div>
            </div>
        </div>
    ) : (
        <NoDataMessage />
    );
};

/**
 * Retrieves the specified dataset from the Vega view (or directly from the
 * store if there are issues with the view).
 */
const getDatasetValues = (datasetName: string, logAttention: boolean) => {
    logTimeStart('getDatasetValues');
    const storeDs = () => {
        logDebug('Falling back to store dataset...');
        return getDenebState()?.dataset?.values;
    };
    try {
        const ds = logAttention
            ? storeDs()
            : VegaViewServices.getDataByName(datasetName) || storeDs();
        logTimeEnd('getDatasetValues');
        return ds;
    } catch (e) {
        logDebug(
            `DatasetViewer: could not retrieve dataset ${datasetName} from Vega view. Returning the visual dataset.`,
            { e }
        );
        logTimeEnd('getDatasetValues');
        return storeDs();
    }
};

/**
 * Provides the necessary structure and rendering logic for the table columns.
 */
const getTableColumns = (
    dataset: IWorkerDatasetViewerDataTableRow[],
    maxLengths: IWorkerDatasetViewerMaxDisplayWidths
): TableColumn<IWorkerDatasetViewerDataTableRow>[] => {
    logDebug('DatasetViewer: calculating table columns...');
    return Object.keys(dataset?.[0])?.map((c) => ({
        id: c,
        name: <span title={getColumnHeaderTooltip(c)}>{c}</span>,
        cell: (row) => (
            <DataTableCell
                displayValue={row[c]?.displayValue}
                field={c}
                rawValue={row[c]?.rawValue}
            />
        ),
        sortable: true,
        selector: (row) => row[c]?.displayValue,
        reorder: true,
        compact: true,
        width: `${calculateMaxWidth(c, maxLengths[c])}px`,
        sortFunction: (rowA, rowB) => {
            const a = rowA[c]?.rawValue as string | number | Date;
            const b = rowB[c]?.rawValue as string | number | Date;
            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            return 0;
        }
    }));
};

/**
 * react-data-table doesn't do dynamic sizing, or let us manually resize via a UI component, so this calculates the
 * effective maximum width of all display so this calculates the effective maximum width of all display values for a
 * given column. We will also measure the column heading, as this can sometimes be wider than the typical profile of
 * values.
 *
 * @privateRemarks we currently use a fixed font size. Column headings are currently 1px less than values, but this is
 * OK. Due to the performance overhead of processing and measuring all data table values, this is off-loaded to a web
 * worker. As such, there is some code repetition here, because methods cannot be shared between the main thread and
 * the worker thread.
 */
const calculateMaxWidth = (fieldName: string, fieldDataMaxWidth: number) => {
    logDebug(
        `DatasetViewer: calculating max width for column [${fieldName}]...`
    );
    const charWidth = getDataTableRenderedCharWidth();
    const pixelBuffer = charWidth * 4;
    const fieldWidth = (fieldName?.length || 0) * charWidth;
    const max = Math.max(fieldDataMaxWidth, fieldWidth) + pixelBuffer;
    logDebug('DatasetViewer: max width calculated as', { max });
    return max;
};

/**
 * For a given column, checks for any special conditions and returns a
 * customized tooltip for the column header.
 */
const getColumnHeaderTooltip = (column: string) => {
    const { translate } = getDenebState().i18n;
    switch (true) {
        case isTableColumnNameReserved(column):
            return getReservedTableColumnTooltip(column);
        case isCrossHighlightComparatorField(column):
            return translate('Pivot_Dataset_HighlightComparatorField', [
                getCrossHighlightFieldBaseMeasureName(column),
                translate('Pivot_Debug_HighlightComparatorEq'),
                translate('Pivot_Debug_HighlightComparatorLt'),
                translate('Pivot_Debug_HighlightComparatorGt'),
                translate('Pivot_Debug_HighlightComparatorNeq'),
                translate('Pivot_Debug_Refer_Documentation')
            ]);
        case isCrossHighlightStatusField(column):
            return translate('Pivot_Dataset_HighlightStatusField', [
                getCrossHighlightFieldBaseMeasureName(column),
                translate('Pivot_Debug_HighlightStatusNeutral'),
                translate('Pivot_Debug_HighlightStatusOn'),
                translate('Pivot_Debug_HighlightStatusOff'),
                translate('Pivot_Debug_Refer_Documentation')
            ]);
        case isCrossHighlightField(column):
            return translate('Pivot_Dataset_HighlightField', [
                getCrossHighlightFieldBaseMeasureName(column)
            ]);
        default:
            return column;
    }
};

/**
 * Create hash of dataset, that we can use to determine changes more cheaply within the UI.
 */
const getDataHash = (data: VegaDatum[]) => {
    logTimeStart('getDataHash');
    const result = getHashValue(data);
    logTimeEnd('getDataHash');
    return result;
};

/**
 * We need to measure how much space a table value (and heading) will take up in the UI, so that we can pre-calculate
 * the width of each column. This is computationally expensive, to do by value, so with a monospace font, we can
 * measure this once, and project by the number of characters in the supplied value. This method measures the width of
 * a single character, based on font size and family.
 *
 * @privateRemarks `OffScreenCanvas` is not supported in Safari until 16.2, and MS currently tests on 16.1, so we need
 * to handle falling back if we can't use it. As we have the formattingutils loaded, we'll use their method.
 */
const getDataTableRenderedCharWidth = () => {
    const textToMeasure = '-'; // MS APIs strip whitespace
    if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(100, 10);
        const ctx: OffscreenCanvasRenderingContext2D = canvas.getContext(
            '2d'
        ) as unknown as OffscreenCanvasRenderingContext2D;
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
 * Perform all i18n translations for values that need to be assigned by the data table worker.
 */
const getDataTableWorkerTranslations = (): IWorkerDatasetViewerTranslations => {
    const { translate } = getDenebState().i18n;
    return {
        placeholderInfinity: translate('Table_Placeholder_Infinity'),
        placeholderNaN: translate('Table_Placeholder_NaN'),
        placeholderTooLong: translate('Table_Placeholder_TooLong'),
        selectedNeutral: translate('Pivot_Debug_SelectedNeutral'),
        selectedOn: translate('Pivot_Debug_SelectedOn'),
        selectedOff: translate('Pivot_Debug_SelectedOff')
    };
};

/**
 * If a column name is a reserved word, then supply a suitable tooltip value.
 */
const getReservedTableColumnTooltip = (field: string) => {
    const { translate } = getDenebState().i18n;
    switch (true) {
        case field === SELECTED_ROW_FIELD_NAME:
            return translate('Pivot_Dataset_SelectedName', [
                field,
                translate('Pivot_Debug_SelectedNeutral'),
                translate('Pivot_Debug_SelectedOn'),
                translate('Pivot_Debug_SelectedOff'),
                translate('Pivot_Debug_Refer_Documentation')
            ]);
        default:
            return translate(
                `Pivot_Dataset_${
                    field === ROW_INDEX_FIELD_NAME ? 'RowIdentifier' : 'Unknown'
                }`,
                [field]
            );
    }
};

/**
 * For a given column value, determine if it's in the list of 'reserved' words that should be processed differently.
 */
const isTableColumnNameReserved = (value: string) =>
    DATA_TABLE_COLUMN_RESERVED_WORDS.indexOf(value) > -1;
