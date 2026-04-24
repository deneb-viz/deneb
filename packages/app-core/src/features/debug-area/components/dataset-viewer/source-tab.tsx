import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SortOrder, TableColumn } from 'react-data-table-component';

import { getHashValue, getNewUuid } from '@deneb-viz/utils/crypto';
import { logDebug, logRender } from '@deneb-viz/utils/logging';
import { getPrunedObject } from '@deneb-viz/utils/object';
import { type VegaDatum } from '@deneb-viz/data-core/value';

import { useDenebState } from '../../../../state';
import {
    DATA_TABLE_VALUE_MAX_DEPTH,
    DATA_TABLE_VALUE_MAX_LENGTH
} from '../../constants';
import {
    datasetViewerWorker,
    IWorkerDatasetViewerDataTableRow,
    type IWorkerDatasetViewerMessage
} from '../../workers';
import { DataTableViewer } from '../data-table/data-table';
import { ProcessingDataMessage } from '../data-table/processing-data-message';
import { NoDataMessage } from '../no-data-message';
import { useDebugWrapperStyles } from '../styles';
import { resolveSourceTabReason } from './source-tab-utils';
import {
    buildDatasetViewerColumns,
    getDatasetViewerCharWidth,
    getDatasetViewerWorkerTranslations
} from './dataset-viewer-worker-helpers';

/**
 * Renders the Source outer pivot of the Debug Area.
 *
 * Reads `state.dataset.values` — the dataset Vega receives, with support
 * fields intact. Processing goes through the same web-worker pipeline as
 * the Data tab so display widths and value formatting are consistent. Sort
 * and page are held in the debug slice under the `source` key so the Data
 * tab's state is untouched.
 *
 * On cross-filter selection Power BI rewrites `state.dataset.values` to
 * include `__selected__` flags; the Source tab reflects that live rewrite
 * (see plan — accepted and documented behaviour).
 */
export const SourceTab = () => {
    const { values, sortEntry, page, setSourceTabSort, setSourceTabPage } =
        useDenebState((state) => ({
            values: state.dataset.values,
            sortEntry: state.debug.dataPivotSort.source,
            page: state.debug.dataPivotPage.source,
            setSourceTabSort: state.debug.setSourceTabSort,
            setSourceTabPage: state.debug.setSourceTabPage
        }));

    const reason = resolveSourceTabReason(values);

    // Hash pruned values so the worker only reruns when the underlying rows
    // actually change (cross-filter selection counts as a change — rewriting
    // __selected__ shifts the hash).
    const prunedValues = useMemo(
        () =>
            getPrunedObject(values, {
                maxDepth: DATA_TABLE_VALUE_MAX_DEPTH
            }) as VegaDatum[],
        [values]
    );
    const hashValue = useMemo(() => getHashValue(prunedValues), [prunedValues]);

    const [tableState, setTableState] = useState<{
        columns: TableColumn<IWorkerDatasetViewerDataTableRow>[] | null;
        jobQueue: string[];
        processing: boolean;
        rows: IWorkerDatasetViewerDataTableRow[] | null;
    }>({
        columns: null,
        jobQueue: [],
        processing: true,
        rows: null
    });

    const worker = useMemo(() => datasetViewerWorker, []);

    // Post a new job to the worker whenever the hashed dataset changes and
    // there's something to process. When the dataset is empty we short-
    // circuit — no worker round-trip, render NoDataMessage directly.
    useEffect(() => {
        if (!window.Worker) return;
        if (!prunedValues || prunedValues.length === 0) {
            setTableState({
                columns: null,
                jobQueue: [],
                processing: false,
                rows: null
            });
            return;
        }
        const jobId = getNewUuid();
        setTableState((prev) => ({
            ...prev,
            jobQueue: [...prev.jobQueue, jobId],
            processing: true
        }));
        const message: IWorkerDatasetViewerMessage = {
            canvasFontCharWidth: getDatasetViewerCharWidth(),
            dataset: prunedValues as Record<string, unknown>[],
            jobId,
            translations: getDatasetViewerWorkerTranslations(),
            valueMaxLength: DATA_TABLE_VALUE_MAX_LENGTH
        };
        logDebug('SourceTab: posting worker message', { jobId });
        worker.postMessage(message);
    }, [hashValue]);

    // Listen for worker responses. Column generation mirrors the Data tab's
    // shape (tooltip per header, inspector-enabled cells, monospace-measured
    // widths) so the two tabs feel identical to the user.
    useEffect(() => {
        if (!window.Worker) return;
        worker.onmessage = (e) => {
            const { jobId, values: rows, maxWidths } = e.data;
            setTableState((prev) => {
                const newQueue = prev.jobQueue.filter((id) => id !== jobId);
                return {
                    columns: buildDatasetViewerColumns(rows, maxWidths),
                    jobQueue: newQueue,
                    processing: newQueue.length > 0,
                    rows
                };
            });
        };
    }, [worker]);

    const handleSort = useCallback(
        (
            column: TableColumn<IWorkerDatasetViewerDataTableRow>,
            sortDirection: SortOrder
        ) => {
            const colId = column?.id ?? null;
            if (!colId) {
                setSourceTabSort(null);
                return;
            }
            setSourceTabSort({
                colId: String(colId),
                asc: sortDirection === 'asc'
            });
        },
        [setSourceTabSort]
    );

    const handleChangePage = useCallback(
        (nextPage: number) => {
            setSourceTabPage(nextPage);
        },
        [setSourceTabPage]
    );

    const classes = useDebugWrapperStyles();
    logRender('SourceTab', {
        rowCount: values.length,
        reason,
        page,
        sortEntry
    });

    if (reason) {
        return <NoDataMessage reason={reason} />;
    }

    if (tableState.processing || !tableState.rows) {
        return (
            <div className={classes.container}>
                <div className={classes.wrapper}>
                    <div className={classes.details}>
                        <ProcessingDataMessage />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={classes.container}>
            <div className={classes.wrapper}>
                <div className={classes.details}>
                    <DataTableViewer
                        columns={tableState.columns ?? []}
                        data={tableState.rows}
                        defaultSortFieldId={sortEntry?.colId ?? null}
                        defaultSortAsc={sortEntry?.asc ?? false}
                        onSort={handleSort}
                        onChangePage={handleChangePage}
                        paginationDefaultPage={page}
                        progressPending={tableState.processing}
                    />
                </div>
            </div>
        </div>
    );
};
