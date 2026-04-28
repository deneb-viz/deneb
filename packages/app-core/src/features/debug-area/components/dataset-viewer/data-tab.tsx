import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TableColumn, TableProps } from 'react-data-table-component';
import { useDebounce } from '@uidotdev/usehooks';

import { getHashValue, getNewUuid } from '@deneb-viz/utils/crypto';
import {
    logDebug,
    logRender,
    logTimeEnd,
    logTimeStart
} from '@deneb-viz/utils/logging';
import { getPrunedObject } from '@deneb-viz/utils/object';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { type VegaDatum } from '@deneb-viz/data-core/value';

import { type DatasetRaw, type DatasetState } from './types';
import {
    datasetViewerWorker,
    IWorkerDatasetViewerDataTableRow,
    type IWorkerDatasetViewerMessage
} from '../../workers';
import {
    DATA_TABLE_VALUE_MAX_DEPTH,
    DATA_TABLE_VALUE_MAX_LENGTH
} from '../../constants';
import { useDenebState } from '../../../../state';
import { NoDataMessage } from '../no-data-message';
import { DataTableViewer } from '../data-table/data-table';
import { ProcessingDataMessage } from '../data-table/processing-data-message';
import { useDebugWrapperStyles } from '../styles';
import {
    buildDatasetViewerColumns,
    getDatasetViewerCharWidth,
    getDatasetViewerWorkerTranslations
} from './dataset-viewer-worker-helpers';
import { resolveDataTabReason } from './data-tab-utils';
import { LOADING_INDICATOR_DEBOUNCE_MS } from './loading-debounce-constants';

type DataTabProps = {
    datasetName: string;
    renderId: string;
};

const DATA_LISTENER_DEBOUNCE_INTERVAL = 100;

/**
 * Renders the Data outer pivot of the Debug Area.
 *
 * Reads rows from `VegaViewServices.getDataByName(datasetName)` — the
 * post-transform, Vega-view-scoped dataset. When the view is unavailable or
 * the named dataset can't be resolved, renders `NoDataMessage` with an
 * explicit reason instead of silently substituting a source-level fallback
 * (the old `getDatasetValues` behaviour, removed in Unit 6).
 *
 * The listener rebinds on `datasetName` or `renderId` change. `renderId`
 * is bumped by `vega-embed.tsx#handleEmbed` AFTER `vegaEmbed()` resolves
 * and the new `View` instance is attached — i.e. the bump tracks actual
 * view replacement, not compile events. (Pre-P3, the bump fired at
 * compile time, which was both racy — DataTab effect ran before the view
 * existed — and noisy: every debounced keystroke compile cycled the
 * listener even when the same view was reused.)
 *
 * Per-tab sort and page state live under `state.debug.dataPivotSort.data` /
 * `state.debug.dataPivotPage.data`, so the Source tab's sort/page are
 * preserved when the user toggles the outer pivot.
 */
export const DataTab = ({ datasetName, renderId }: DataTabProps) => {
    const { sortEntry, page, setDataTabSort, setDataTabPage, logError } =
        useDenebState((state) => ({
            sortEntry: state.debug.dataPivotSort.data,
            page: state.debug.dataPivotPage.data,
            setDataTabSort: state.debug.setDataTabSort,
            setDataTabPage: state.debug.setDataTabPage,
            logError: state.compilation.logError
        }));

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

    // Resolve the current empty-state reason from the view + name + values.
    // Two-way mapping (view-unavailable / dataset-unavailable / null) —
    // `getDataByName` swallows internal errors and returns `undefined` for
    // both "not registered" and "transform failure", so the call site
    // cannot distinguish them (see plan Unit 6).
    const view = VegaViewServices.getView();
    const viewAvailable = view !== null;
    const currentValues =
        viewAvailable && datasetName !== ''
            ? VegaViewServices.getDataByName(datasetName)
            : undefined;
    const reason = resolveDataTabReason(
        viewAvailable,
        datasetName,
        currentValues
    );

    /**
     * When our dataset changes, we need to send it to our web worker for processing.
     */
    useEffect(() => {
        logDebug('DataTab: updating dataset state...');
        if (window.Worker && datasetRaw) {
            const jobId = getNewUuid();
            setDatasetState((datasetState) => ({
                ...datasetState,
                jobQueue: [...datasetState.jobQueue, jobId],
                processing: true
            }));
            logDebug('DataTab: using worker...', {
                datasetState
            });
            /**
             * We have to fix/prune a dataset prior to sending to the worker, as postMessage gets upset about cyclics
             * and methods.
             */
            const message: IWorkerDatasetViewerMessage = {
                canvasFontCharWidth: getDatasetViewerCharWidth(),
                dataset: datasetRaw.values,
                jobId,
                translations: getDatasetViewerWorkerTranslations(),
                valueMaxLength: DATA_TABLE_VALUE_MAX_LENGTH
            };
            datasetWorker.postMessage(message);
            logDebug('DataTab: worker message sent');
        }
    }, [datasetRaw.hashValue]);

    /**
     * When we get a response from our worker, we need to update our state with the processed data table output.
     *
     * The dataset worker is a module-level singleton shared with `SourceTab`,
     * so we attach via `addEventListener` rather than the property-assignment
     * `onmessage = ...` (which would let the second-mounted tab silently
     * clobber the first's handler). To stay safe under concurrent mounts
     * (Strict Mode double-invoke, Source <-> Data toggling with a job in
     * flight), the handler ignores responses whose `jobId` it does not own —
     * `jobQueue` membership is the per-tab ownership filter.
     *
     * State reads inside the handler use the functional-updater form
     * (`setDatasetState((prev) => ...)`) so we always observe the latest
     * `jobQueue` rather than the closure value captured at mount.
     */
    useEffect(() => {
        if (!window.Worker) return;
        const handler = (e: MessageEvent) => {
            const { jobId, values, maxWidths } = e.data;
            setDatasetState((prev) => {
                // Drop responses that belong to another tab's worker round-trip.
                if (!prev.jobQueue.includes(jobId)) {
                    return prev;
                }
                const newJobQueue = prev.jobQueue.filter((id) => id !== jobId);
                const complete = newJobQueue.length === 0;
                logDebug('DataTab: worker response received', {
                    jobId,
                    prevQueue: prev.jobQueue,
                    nextQueue: newJobQueue,
                    complete
                });
                return {
                    columns: buildDatasetViewerColumns(values, maxWidths),
                    jobQueue: newJobQueue,
                    processing: !complete,
                    values
                };
            });
        };
        datasetWorker.addEventListener('message', handler);
        return () => {
            datasetWorker.removeEventListener('message', handler);
        };
    }, [datasetWorker]);

    /**
     * Attempt to add specified data listener to the Vega view.
     */
    const addListener = () => {
        try {
            logDebug(
                `DataTab: attempting to add listener for dataset [${datasetName}]...`
            );
            VegaViewServices.getView()?.addDataListener(
                datasetName,
                dataListener
            );
            logDebug(`DataTab: listener for dataset [${datasetName}] added.`);
        } catch {
            logDebug(
                `DataTab: listener for dataset [${datasetName}] could not be added.`
            );
        }
    };

    /**
     * Attempt to remove specified data listener from the Vega view.
     */
    const removeListener = () => {
        try {
            logDebug(
                `DataTab: attempting to remove listener for dataset [${datasetName}]...`
            );
            VegaViewServices.getView()?.removeDataListener(
                datasetName,
                dataListener
            );
            logDebug(`DataTab: listener for dataset [${datasetName}] removed.`);
        } catch {
            logDebug(
                `DataTab: listener for dataset [${datasetName}] could not be removed.`
            );
        }
    };

    /**
     * Attempt to cycle (add/remove) listeners for the specified dataset.
     */
    const cycleListeners = () => {
        logDebug(`DataTab: cycling listeners for dataset: [${datasetName}]...`);
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
     * Track hash to avoid unnecessary updates.
     */
    const lastListenerHashRef = useRef<string | null>(null);

    /**
     * Handler for dataset listener events. Vega exposes the `value` parameter
     * as `object` in its public typings, so we follow suit rather than `any`.
     */
    const dataListener = useCallback((name: string, value: object) => {
        const newDataset = getPrunedObject(value);
        const hashValue = getDataHash(newDataset);

        // Skip update if hash hasn't changed - prevents looping on derived datasets
        if (hashValue === lastListenerHashRef.current) {
            logDebug(
                `DataTab: dataset ${name} listener fired but hash unchanged, skipping`
            );
            return;
        }

        // Skip processing if we have data but the listener returns an empty array - likely an incremental update in progress
        if (
            Array.isArray(newDataset) &&
            newDataset.length === 0 &&
            lastListenerHashRef.current !== null
        ) {
            logDebug(
                `DataTab: dataset ${name} listener received empty array while we have existing data, skipping (likely incremental update in progress)`
            );
            return;
        }

        logDebug(`DataTab: dataset ${name} has changed`, {
            previousHash: lastListenerHashRef.current,
            newHash: hashValue
        });

        lastListenerHashRef.current = hashValue;
        setDatasetRawPending(() => ({
            hashValue,
            values: newDataset
        }));
    }, []);

    /**
     * Ensure that listener is added/removed when the data might change or we re-render (new view).
     *
     * Dep array is `[datasetName, renderId]`. `renderId` is bumped from
     * `vega-embed.tsx#handleEmbed` post-embed, so this effect runs only
     * when an actual fresh `View` instance has been attached — the
     * load-bearing "rebind on view replacement" invariant.
     */
    useEffect(() => {
        // Reset the listener hash ref when dataset or view changes to ensure first listener event is processed
        lastListenerHashRef.current = null;

        try {
            logDebug(
                `DataTab: getting latest dataset from view (${datasetName})...`
            );
            // Direct read from the view — no fallback to the store's
            // dataset. If the view isn't ready or the name doesn't resolve,
            // `reason` (computed above) already captures that and the
            // render branch shows `NoDataMessage`; we still try to prime
            // the worker state so the table is populated immediately when
            // the view catches up.
            const datasetView = viewAvailable
                ? VegaViewServices.getDataByName(datasetName)
                : undefined;
            logDebug(
                `DataTab: dataset from view (${datasetName})`,
                datasetView
            );
            // `getPrunedObject` requires an object; when the view or name
            // isn't resolvable we fall through to an empty array so the
            // hash pipeline stays consistent. The actual rendering branch
            // is handled above via `reason`.
            const datasetForHash = getPrunedObject(datasetView ?? [], {
                maxDepth: DATA_TABLE_VALUE_MAX_DEPTH
            });
            logDebug(`DataTab: latest dataset retrieved (${datasetName})`, {
                latest: datasetForHash
            });
            logDebug(
                `DataTab: calculating latest dataset hash (${datasetName})...`
            );
            const latestHash = getDataHash(datasetForHash);
            logDebug(
                `DataTab: latest dataset hash calculated (${datasetName})`,
                {
                    latestHash
                }
            );
            const latestDatasetRaw: DatasetRaw = {
                values: datasetForHash,
                hashValue: latestHash
            };
            logDebug('DataTab: checking for dataset change...', {
                datasetName,
                datasetRaw,
                latestDatasetRaw
            });
            if (latestHash !== datasetRaw?.hashValue) {
                logDebug(
                    `DataTab: change necessitates dataset update. Updating...`,
                    {
                        datasetName,
                        renderId
                    }
                );
                setDatasetRaw(() => latestDatasetRaw);
            } else {
                logDebug(
                    `DataTab: no change detected. Skipping dataset update.`
                );
            }
            // Always cycle listeners when this effect runs (renderId change means new view)
            cycleListeners();
        } catch (e) {
            logDebug(`DataTab: error getting latest dataset from view.`, {
                e
            });
            logError(
                `Failed to load dataset [${datasetName}] from view. Error details: ${(e as Error).message}`
            );
        }
        return () => {
            removeListener();
        };
    }, [datasetName, renderId]);

    /**
     * Keep sort persisted across renders via the debug slice's per-tab
     * sort record (`state.debug.dataPivotSort.data`). The Source tab's
     * sort is untouched.
     */
    const handleSort: TableProps<
        IWorkerDatasetViewerDataTableRow[]
    >['onSort'] = (column, sortDirection) => {
        logDebug('DataTab: setting sort columns...', {
            column,
            sortDirection
        });
        const colId = column?.id ?? null;
        if (!colId) {
            setDataTabSort(null);
            return;
        }
        setDataTabSort({
            colId: String(colId),
            asc: sortDirection === 'asc'
        });
    };

    const handleChangePage = useCallback(
        (nextPage: number) => {
            setDataTabPage(nextPage);
        },
        [setDataTabPage]
    );

    const classes = useDebugWrapperStyles();
    // Debounce the `processing` term only — the "no rows yet" term stays
    // raw so first-load shows the spinner immediately. See
    // `loading-debounce-constants.ts` for the threshold rationale.
    const debouncedProcessing = useDebounce(
        datasetState.processing,
        LOADING_INDICATOR_DEBOUNCE_MS
    );

    logRender('DataTab', {
        datasetState,
        datasetRaw,
        renderId,
        reason,
        sortEntry,
        page
    });

    if (reason) {
        return <NoDataMessage reason={reason} />;
    }

    // Either the worker is still processing (debounced — fast round-trips
    // don't flicker the spinner), or it hasn't produced any rows yet
    // (view + name + defined values, but no rows in `datasetState.values`).
    // The empty-rows term is NOT debounced so first-load shows the spinner
    // immediately. Mirrors the consolidated check in `SourceTab`.
    //
    // Inline rather than via `shouldShowLoadingIndicator` so TypeScript can
    // narrow `datasetState.values` from `… | null` to `…[]` past the guard.
    // The helper exists for unit-test ergonomics; behaviour is identical.
    if (debouncedProcessing || !datasetState.values?.length) {
        return <ProcessingDataMessage />;
    }

    return (
        <div className={classes.container}>
            <div className={classes.wrapper}>
                <div className={classes.details}>
                    <DataTableViewer
                        columns={
                            (datasetState.columns ??
                                []) as TableColumn<IWorkerDatasetViewerDataTableRow>[]
                        }
                        data={datasetState.values}
                        defaultSortFieldId={sortEntry?.colId ?? null}
                        defaultSortAsc={sortEntry?.asc ?? false}
                        onSort={handleSort}
                        onChangePage={handleChangePage}
                        paginationDefaultPage={page}
                        progressPending={debouncedProcessing}
                    />
                </div>
            </div>
        </div>
    );
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
