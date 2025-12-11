import React, { useEffect, useMemo, useState } from 'react';
import { TableColumn, TableProps } from 'react-data-table-component';
import debounce from 'lodash/debounce';
import isEqual from 'lodash/isEqual';
import keys from 'lodash/keys';

import { useDebugStyles, DATA_TABLE_VALUE_MAX_LENGTH } from '..';
import { DataTableViewer } from './data-table-viewer';
import { getState } from '../../../store';
import { NoDataMessage } from './no-data-message';
import { DataTableCell } from './data-table-cell';
import {
    getColumnHeaderTooltip,
    getDataTableRenderedCharWidth,
    getDataTableWorkerTranslations
} from '../data-table';
import { TABLE_VALUE_MAX_DEPTH } from '../../../constants';
import { VegaViewServices } from '../../vega-extensibility';

import { getHashValue, getNewUuid } from '@deneb-viz/utils/crypto';
import {
    datasetViewerWorker,
    ProcessingDataMessage,
    type IWorkerDatasetViewerDataTableRow,
    type IWorkerDatasetViewerMaxDisplayWidths,
    type IWorkerDatasetViewerMessage
} from '@deneb-viz/app-core';
import {
    logDebug,
    logRender,
    logTimeEnd,
    logTimeStart
} from '@deneb-viz/utils/logging';
import { getPrunedObject } from '@deneb-viz/utils/object';

interface IDatasetViewerProps {
    datasetName: string;
    hashValue: string;
    logAttention: boolean;
    renderId: string;
}

interface IDatasetRaw {
    hashValue: string;
    values: any[];
}

interface IDatasetState {
    columns: TableColumn<IWorkerDatasetViewerDataTableRow>[];
    jobQueue: string[];
    processing: boolean;
    values: IWorkerDatasetViewerDataTableRow[];
}

const DATA_LISTENER_DEBOUNCE_INTERVAL = 100;

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
    const [datasetRaw, setDatasetRaw] = useState<IDatasetRaw>({
        hashValue: null,
        values: []
    });
    const [datasetState, setDatasetState] = useState<IDatasetState>({
        columns: null,
        jobQueue: [],
        processing: true,
        values: null
    });
    const datasetWorker = useMemo(() => datasetViewerWorker, []);
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
        } catch (e) {
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
        } catch (e) {
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
     * Handler for dataset listener events.
     */
    const dataListener = React.useCallback(
        debounce((name: string, value: any) => {
            logDebug(
                `DatasetViewer: [${renderId}] dataset ${name} has changed`,
                value
            );
            const newDataset = getPrunedObject(value);
            const hashValue = getDataHash(newDataset);
            setDatasetRaw(() => ({
                hashValue,
                values: newDataset
            }));
        }, DATA_LISTENER_DEBOUNCE_INTERVAL),
        []
    );
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
                maxDepth: TABLE_VALUE_MAX_DEPTH
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
            const latestDatasetRaw: IDatasetRaw = {
                values: datasetForHash,
                hashValue: latestHash
            };
            logDebug('DataSetViewer: checking for dataset change...', {
                datasetName,
                datasetRaw,
                latestDatasetRaw
            });
            if (!isEqual(latestHash, datasetRaw?.hashValue)) {
                logDebug(
                    `DatasetViewer: change necessitates dataset update. Updating...`,
                    {
                        hashValue,
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
            const {
                specification: { logError }
            } = getState();
            logDebug(`DatasetViewer: error getting latest dataset from view.`, {
                e
            });
            logError(
                `Failed to load dataset [${datasetName}] from view. Error details: ${e.message}`
            );
        }
        return () => {
            removeListener();
        };
    }, [hashValue, datasetName, renderId, logAttention]);
    /**
     * Keep sort peristed across renders.
     */
    const handleSort: TableProps<
        IWorkerDatasetViewerDataTableRow[]
    >['onSort'] = (column, sortDirection) => {
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
    logTimeStart('getDatasetValues');
    const storeDs = () => {
        logDebug('Falling back to store dataset...');
        return getState()?.dataset?.values;
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
    return keys(dataset?.[0])?.map((c) => ({
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
            const a = rowA[c]?.rawValue;
            const b = rowB[c]?.rawValue;
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

/**
 * Create hash of dataset, that we can use to determine changes more cheaply
 * within the UI.
 */
const getDataHash = (data: any[]) => {
    logTimeStart('getDataHash');
    const result = getHashValue(data);
    logTimeEnd('getDataHash');
    return result;
};
