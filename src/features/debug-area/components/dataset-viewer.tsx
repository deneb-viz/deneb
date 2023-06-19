import React, { useEffect, useMemo, useState } from 'react';
import { TableColumn, TableProps } from 'react-data-table-component';
import keys from 'lodash/keys';
import { v4 as uuidv4 } from 'uuid';

import { useDebugStyles, DATA_TABLE_VALUE_MAX_LENGTH } from '..';
import { DataTableViewer } from './data-table-viewer';
import { getState } from '../../../store';
import { NoDataMessage } from './no-data-message';
import { ProcessingDataMessage } from './processing-data-message';
import { DataTableCell } from './data-table-cell';
import {
    getColumnHeaderTooltip,
    getDataTableRenderedCharWidth,
    getDataTableWorkerTranslations,
    getDatasetForWorker
} from '../data-table';
import { logDebug, logRender } from '../../logging';
import { DATASET_IDENTITY_NAME, DATASET_KEY_NAME } from '../../../constants';
import {
    IDataTableRow,
    IDataTableWorkerMaxDisplayWidths,
    IDataTableWorkerMessage,
    IDataTableWorkerResponse
} from '../types';
import { VegaViewServices } from '../../vega-extensibility';
import { getDataTableWorker } from '../data-table-worker';

interface IDatasetViewerProps {
    datasetName: string;
    hashValue: string;
    logAttention: boolean;
    renderId: string;
}

interface IDatasetState {
    columns: TableColumn<IDataTableRow>[];
    jobQueue: string[];
    processing: boolean;
    values: IDataTableRow[];
}

/**
 * Handles display of dataset details for the current Vega view.
 */
// eslint-disable-next-line max-lines-per-function
export const DatasetViewer: React.FC<IDatasetViewerProps> = ({
    datasetName,
    hashValue,
    logAttention,
    renderId
}) => {
    const [sortColumnId, setSortColumnId] = useState<string | number>(null);
    const [sortAsc, setSortAsc] = useState(false);
    const [datasetRaw, setDatasetRaw] = useState<any[]>(null);
    const [datasetState, setDatasetState] = useState<IDatasetState>({
        columns: null,
        jobQueue: [],
        processing: true,
        values: null
    });
    const datasetWorker = useMemo(() => getDataTableWorker(), []);
    /**
     * When our dataset changes, we need to send it to our web worker for
     * processing.
     */
    useEffect(() => {
        logDebug('DatasetViewer: updating dataset state...');
        if (window.Worker && datasetRaw) {
            const jobId = uuidv4();
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
            const message: IDataTableWorkerMessage = {
                canvasFontCharWidth: getDataTableRenderedCharWidth(),
                dataset: getDatasetForWorker(datasetRaw),
                datasetKeyName: DATASET_KEY_NAME,
                jobId,
                translations: getDataTableWorkerTranslations(),
                valueMaxLength: DATA_TABLE_VALUE_MAX_LENGTH
            };
            datasetWorker.postMessage(message);
            logDebug('DatasetViewer: worker message sent');
        }
    }, [datasetRaw]);
    /**
     * When we get a response from our worker, we need to update our state
     * with the processed data table output.
     */
    useEffect(() => {
        if (window.Worker) {
            datasetWorker.onmessage = (e) => {
                const { jobId, values, maxWidths } =
                    e.data as IDataTableWorkerResponse;
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
                    values,
                    jobQueue: newJobQueue,
                    processing: !complete
                }));
            };
        }
    }, [datasetWorker]);
    /**
     * Attempt to add specified data listener to the Vega view.
     */
    const addListener = () => {
        try {
            `DatasetViewer: attempting to add listener for dataset ${datasetName}...`;
            VegaViewServices.getView()?.addDataListener(
                datasetName,
                dataListener
            );
            `DatasetViewer: listener for dataset ${datasetName} added.`;
        } catch (e) {
            logDebug(
                `DatasetViewer: listener for dataset ${datasetName} could not be added.`
            );
        }
    };
    /**
     * Attempt to remove specified data listener from the Vega view.
     */
    const removeListener = () => {
        try {
            `DatasetViewer: attempting to remove listener for dataset ${datasetName}...`;
            VegaViewServices.getView()?.removeDataListener(
                datasetName,
                dataListener
            );
            `DatasetViewer: listener for dataset ${datasetName} removed.`;
        } catch (e) {
            logDebug(
                `DatasetViewer: listener for dataset ${datasetName} could not be removed.`
            );
        }
    };
    /**
     * Attempt to cycle (add/remove) listeners for the specified dataset.
     */
    const cycleListeners = () => {
        logDebug(
            `DatasetViewer: cycling listeners for dataset: ${datasetName}...`
        );
        removeListener();
        addListener();
    };
    /**
     * Handler for dataset listener events.
     */
    const dataListener = (name: string, value: any) => {
        logDebug(
            `DatasetViewer: [${renderId}] dataset ${name} has changed`,
            value
        );
        setDatasetRaw(() => value);
    };
    /**
     * Ensure that listener is added/removed when the data might change.
     */
    useEffect(() => {
        logDebug(
            `DatasetViewer: change necessitates dataset update. Updating...`,
            { hashValue, datasetName, renderId, logAttention }
        );
        setDatasetRaw(() => getDatasetValues(datasetName, logAttention));
        cycleListeners();
        return () => {
            removeListener();
        };
    }, [hashValue, datasetName, renderId, logAttention]);
    /**
     * Keep sort peristed across renders.
     */
    const handleSort: TableProps<IDataTableRow[]>['onSort'] = (
        column,
        sortDirection
    ) => {
        logDebug('DatasetViewer: setting sort columns...', {
            column,
            sortDirection
        });
        setSortColumnId(column.id);
        setSortAsc(() => sortDirection === 'asc');
    };
    const classes = useDebugStyles();
    logRender('DatasetViewer', {
        datasetState,
        datasetRaw,
        hashValue,
        renderId,
        logAttention,
        sortColumnId,
        sortAsc
    });
    return datasetState.processing ? (
        <ProcessingDataMessage />
    ) : datasetState.values?.length ? (
        <div className={classes.container}>
            <div className={classes.contentWrapper}>
                <div className={classes.dataTableDetails}>
                    <DataTableViewer
                        columns={datasetState.columns}
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
    const storeDs = () => {
        logDebug('Falling back to store dataset...');
        return getState()?.dataset?.values;
    };
    try {
        return logAttention
            ? storeDs()
            : VegaViewServices.getDataByName(datasetName) || storeDs();
    } catch (e) {
        logDebug(
            `DatasetViewer: could not retrieve dataset ${datasetName} from Vega view. Returning the visual dataset.`,
            { e }
        );
        return storeDs();
    }
};

/**
 * Provides the necessary structure and rendering logic for the table columns.
 */
const getTableColumns = (
    dataset: IDataTableRow[],
    maxLengths: IDataTableWorkerMaxDisplayWidths
): TableColumn<IDataTableRow>[] => {
    logDebug('DatasetViewer: calculating table columns...');
    return keys(dataset?.[0])
        ?.filter(
            (c) => [DATASET_KEY_NAME, DATASET_IDENTITY_NAME].indexOf(c) === -1
        )
        .map((c) => ({
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
            width: `${calculateMaxWidth(c, maxLengths[c])}px`
        }));
};

/**
 * react-data-table doesn't do dynamic sizing, or let us manually resize via a
 * UI component, so this calculates the effective maximum width of all display
 * so this calculates the effective maximum width of all display values for a
 * given column. We will also measure the column heading, as this can sometimes
 * be wider than the typical profile of values.
 *
 * @privateRemarks we currently use a fixed font size. Column headings are
 * currently 1px less than values, but this is OK. Due to the performance
 * overhead of processing and measuring all data table values, this is off-
 * loaded to a web worker. As such, there is some code repetition here, because
 * methods cannot be shared between the main thread and the worker thread.
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