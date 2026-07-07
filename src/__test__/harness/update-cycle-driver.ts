import type powerbi from 'powerbi-visuals-api';

import {
    canFetchMoreFromDataview,
    getCategoricalDataViewFromOptions,
    getCategoricalRowCount,
    resolveDatasetUpdateAction,
    type DatasetUpdateAction
} from '../../lib/dataset/data-view';
import { createRenderingLifecycleCoordinator } from '../../lib/rendering-lifecycle/coordinator';
import type {
    RenderingLifecycleEvent,
    RenderingLifecycleId,
    SafetyNetHandle,
    SafetyNetScheduler
} from '../../lib/rendering-lifecycle/types';
import type { VisualFormattingSettingsModel } from '../../lib/persistence';
import {
    createFakeVisualHost,
    type FakeVisualHostHandle,
    type FetchMoreResponse
} from './fake-visual-host';
import {
    createMockDatasetSlice,
    type MockDatasetSlice,
    type MockDatasetState,
    type SetDatasetPayload
} from './mock-dataset-slice';
import { OPERATION_KIND_CREATE } from './fixtures';

/**
 * Scripted update-cycle driver: the U4 fake-host lifecycle harness.
 *
 * WHAT IS REAL vs WHAT IS MIRRORED
 * ────────────────────────────────
 * Real production modules under test:
 *  - `createRenderingLifecycleCoordinator` (src/lib/rendering-lifecycle/
 *    coordinator.ts) — attached via its existing DI seams (`emitter` =
 *    the fake host's event service, `scheduler` = a synthetic
 *    safety-net scheduler, `observer` = a recording sink).
 *  - `resolveDatasetUpdateAction` and the pure data-view helpers
 *    (src/lib/dataset/data-view.ts).
 *  - Optionally `hasDataViewChanged` (src/lib/dataset/processing.ts),
 *    wired in by the scenario suite through the `hasDataChanged` seam.
 *
 * Mirrored (NOT real): the dispatch glue of `Deneb.update()` /
 * `Deneb.resolveDataset()` and its handlers in src/index.ts. The Deneb
 * visual class has heavy constructor side effects (React root, host
 * services, i18n, store wiring) that make it impractical to instantiate
 * in a node test, so `driveUpdate` transcribes the dispatch shape
 * statement-for-statement. If src/index.ts's dispatch changes, THIS
 * MIRROR MUST BE UPDATED to match — each mirrored block carries a
 * pointer to its source. The invariants the scenarios assert (exactly-
 * once terminals, supersede ordering, recovery preserving the dataset
 * slice) are enforced by the REAL coordinator and decision function,
 * not by the mirror.
 */

export type UpdateCycleDriverConfig = {
    /**
     * Change-detection seam (mirrors the `hasDataViewChanged` call in
     * `Deneb.gatherDatasetUpdateContext`). Scenario suites wire the
     * real `hasDataViewChanged` here (freshly imported per test so its
     * module-level reference cache starts clean).
     */
    hasDataChanged: (categorical: powerbi.DataViewCategorical) => boolean;
    /** Script for the fake host's `fetchMoreData` responses. */
    fetchMoreResponses?: FetchMoreResponse[];
    /** Seed state for the mocked dataset slice. */
    initialDatasetState?: Partial<MockDatasetState>;
    /**
     * Value of the `dataLimit.loading.override` setting consumed by the
     * real `canFetchMoreFromDataview`. Defaults to true (segmented
     * fetching enabled) since that is the interesting path.
     */
    dataLimitOverride?: boolean;
    /**
     * Stand-in for `getMappedDataset` (the real mapper needs the full
     * data-core processing chain and host locale — out of scope for
     * lifecycle orchestration). Defaults to a row-count-faithful
     * lightweight mapping.
     */
    mapDataset?: (
        categorical: powerbi.DataViewCategorical
    ) => SetDatasetPayload;
};

export type UpdateCycleDriver = {
    /** Drive one host update through the mirrored dispatch. */
    update: (options: powerbi.extensibility.visual.VisualUpdateOptions) => void;
    /**
     * Make the NEXT `update()` throw from inside the update body after
     * `open()` (mirrors any dispatch-internal failure — change
     * detection, mapping, store sync). Consumed once.
     */
    queueFault: (error: Error) => void;
    /** Async render side: React/Vega embed reports the render began. */
    startRender: () => void;
    /** Async render side: embed completed — close the pending render. */
    completeRender: () => void;
    /** Async render side: embed errored — fail the pending render. */
    failRender: (error: unknown) => void;
    /** Fire every armed (uncancelled) safety-net callback. */
    fireSafetyNets: () => void;
    /** Number of armed, uncancelled, unfired safety-net callbacks. */
    pendingSafetyNetCount: () => number;
    /** The fake host handle (emitter record + fetchMoreData record). */
    host: FakeVisualHostHandle;
    /** Ordered coordinator observer events. */
    observerEvents: RenderingLifecycleEvent[];
    /** Ordered `DatasetUpdateAction`s the real decision function resolved. */
    actions: DatasetUpdateAction[];
    /** Errors update() caught (mirroring `Deneb.update`'s catch). */
    caughtErrors: unknown[];
    /** The mocked dataset slice (state + recorded mutations). */
    dataset: MockDatasetSlice;
    /** Ids opened but not yet terminally closed/failed (must be empty at scenario end). */
    getOpenLifecycleIds: () => RenderingLifecycleId[];
};

/**
 * Deterministic stand-in for the production `setTimeout`-based
 * safety-net scheduler (same shape as the synthetic scheduler in the
 * coordinator's unit suite, extended to hold multiple pending
 * callbacks so update-storm scenarios can arm several nets).
 */
const createSyntheticSafetyNetScheduler = () => {
    const pending = new Map<number, () => void>();
    let nextHandle = 1;
    const scheduler: SafetyNetScheduler = {
        schedule: (callback) => {
            const handleId = nextHandle;
            nextHandle++;
            pending.set(handleId, callback);
            const handle: SafetyNetHandle = {
                cancel: () => {
                    pending.delete(handleId);
                }
            };
            return handle;
        }
    };
    return {
        scheduler,
        fireAll: () => {
            const callbacks = [...pending.values()];
            pending.clear();
            callbacks.forEach((callback) => callback());
        },
        pendingCount: () => pending.size
    };
};

const defaultMapDataset = (
    categorical: powerbi.DataViewCategorical
): SetDatasetPayload => {
    const rowsLoaded = getCategoricalRowCount(categorical);
    return {
        values: Array.from({ length: rowsLoaded }, (_, i) => ({ __row: i })),
        rowsLoaded
    };
};

/**
 * Minimal settings surface for the real `canFetchMoreFromDataview`,
 * which only reads `dataLimit.loading.override.value`. The cast is the
 * same structural-subset pattern the existing dataset tests use.
 */
const buildSettingsStub = (
    dataLimitOverride: boolean
): VisualFormattingSettingsModel =>
    ({
        dataLimit: {
            loading: { override: { value: dataLimitOverride } }
        }
    }) as unknown as VisualFormattingSettingsModel;

export const createUpdateCycleDriver = (
    config: UpdateCycleDriverConfig
): UpdateCycleDriver => {
    const host = createFakeVisualHost({
        fetchMoreResponses: config.fetchMoreResponses
    });
    const observerEvents: RenderingLifecycleEvent[] = [];
    const safetyNet = createSyntheticSafetyNetScheduler();
    const coordinator = createRenderingLifecycleCoordinator({
        emitter: host.host.eventService,
        scheduler: safetyNet.scheduler,
        observer: (event) => observerEvents.push(event)
    });
    const dataset = createMockDatasetSlice(config.initialDatasetState);
    const settings = buildSettingsStub(config.dataLimitOverride ?? true);
    const mapDataset = config.mapDataset ?? defaultMapDataset;
    const actions: DatasetUpdateAction[] = [];
    const caughtErrors: unknown[] = [];
    let queuedFault: Error | null = null;

    /**
     * Mirrors `Deneb.handleFetchMore` (src/index.ts): set the fetching
     * flag, ask the host for the next segment, and either close the
     * lifecycle synchronously (host accepted — the next segment arrives
     * as its own update) or fall through to finalise-with-what-we-have
     * (host declined). A synchronous host throw clears the flag before
     * re-throwing so the visual cannot get stuck on FetchingMessage.
     */
    const dispatchFetchMore = (
        categorical: powerbi.DataViewCategorical,
        rowsLoaded: number
    ): void => {
        dataset.setIsFetchingAdditional({
            isFetchingAdditional: true,
            rowsLoaded
        });
        let fetchSuccess: boolean;
        try {
            fetchSuccess = host.host.fetchMoreData(true);
        } catch (e) {
            dataset.setIsFetchingAdditional({
                isFetchingAdditional: false,
                rowsLoaded
            });
            throw e;
        }
        if (fetchSuccess) {
            coordinator.closeCurrent();
            return;
        }
        dataset.setIsFetchingAdditional({
            isFetchingAdditional: false,
            rowsLoaded
        });
        dataset.setDataset(mapDataset(categorical));
        coordinator.bindPendingRenderCurrent();
    };

    /**
     * Mirrors `Deneb.handleRecoverInterruptedFetch` (src/index.ts):
     * clear the stuck flag ONLY — the existing dataset slice is
     * preserved (no `setDataset`), and `Math.max` prevents the host's
     * re-shipped reduced payload from shrinking `rowsLoaded` below
     * what actually sits in `dataset.values`. Non-rendering: closes
     * the lifecycle synchronously.
     */
    const dispatchRecoverInterruptedFetch = (rowsLoaded: number): void => {
        const currentStateRowsLoaded = dataset.state.rowsLoaded;
        dataset.setIsFetchingAdditional({
            isFetchingAdditional: false,
            rowsLoaded: Math.max(currentStateRowsLoaded, rowsLoaded)
        });
        coordinator.closeCurrent();
    };

    /**
     * Mirrors `Deneb.handleNormalFinalise` (src/index.ts): commit the
     * mapped dataset and bind the pending render so the async embed
     * callbacks target this update's lifecycle id.
     */
    const dispatchNormalFinalise = (
        categorical: powerbi.DataViewCategorical,
        rowsLoaded: number
    ): void => {
        dataset.setIsFetchingAdditional({
            isFetchingAdditional: false,
            rowsLoaded
        });
        dataset.setDataset(mapDataset(categorical));
        coordinator.bindPendingRenderCurrent();
    };

    /**
     * Mirrors `Deneb.resolveDataset` + `Deneb.gatherDatasetUpdateContext`
     * (src/index.ts): gather the decision inputs, resolve the action via
     * the REAL `resolveDatasetUpdateAction`, and dispatch.
     */
    const resolveDataset = (
        options: powerbi.extensibility.visual.VisualUpdateOptions
    ): void => {
        const categorical = getCategoricalDataViewFromOptions(
            options
        ) as powerbi.DataViewCategorical;
        const canFetchMore = canFetchMoreFromDataview(
            settings,
            options?.dataViews?.[0]?.metadata as powerbi.DataViewMetadata
        );
        const dataChanged = config.hasDataChanged(categorical);
        const isInitialSegment =
            (
                options as {
                    operationKind?: powerbi.VisualDataChangeOperationKind;
                }
            ).operationKind === OPERATION_KIND_CREATE;
        const action = resolveDatasetUpdateAction({
            dataChanged,
            canFetchMore,
            isFetchingAdditional: dataset.state.isFetchingAdditional,
            isInitialSegment
        });
        actions.push(action);

        if (action.kind === 'skip') {
            // Non-rendering dispatch — balanced started/finished pair.
            coordinator.closeCurrent();
            return;
        }
        const rowsLoaded = getCategoricalRowCount(categorical);
        if (action.kind === 'fetch-more') {
            dispatchFetchMore(categorical, rowsLoaded);
            return;
        }
        switch (action.reason) {
            case 'recover-interrupted-fetch': {
                dispatchRecoverInterruptedFetch(rowsLoaded);
                return;
            }
            case 'normal': {
                dispatchNormalFinalise(categorical, rowsLoaded);
                return;
            }
            default: {
                const _exhaustive: never = action.reason;
                throw new Error(
                    `Unhandled finalise reason: ${String(_exhaustive)}`
                );
            }
        }
    };

    /**
     * Mirrors `Deneb.update` (src/index.ts): open the lifecycle FIRST
     * inside the try, dispatch, route any throw to `failCurrent`, and
     * arm the safety-net in the finally for whichever id was opened.
     */
    const update = (
        options: powerbi.extensibility.visual.VisualUpdateOptions
    ): void => {
        let openId: RenderingLifecycleId | undefined;
        try {
            openId = coordinator.open(options);
            if (queuedFault) {
                const fault = queuedFault;
                queuedFault = null;
                throw fault;
            }
            resolveDataset(options);
        } catch (e) {
            coordinator.failCurrent(e);
            caughtErrors.push(e);
        } finally {
            if (openId !== undefined) {
                coordinator.armSafetyNet(openId);
            }
        }
    };

    const getOpenLifecycleIds = (): RenderingLifecycleId[] => {
        const opened = new Set<RenderingLifecycleId>();
        for (const event of observerEvents) {
            if (event.kind === 'opened') opened.add(event.id);
            if (event.kind === 'closed' || event.kind === 'failed') {
                opened.delete(event.id);
            }
        }
        return [...opened];
    };

    return {
        update,
        queueFault: (error) => {
            queuedFault = error;
        },
        startRender: () => coordinator.markPendingRenderStarted(),
        completeRender: () => coordinator.closePendingRender(),
        failRender: (error) => coordinator.failPendingRender(error),
        fireSafetyNets: safetyNet.fireAll,
        pendingSafetyNetCount: safetyNet.pendingCount,
        host,
        observerEvents,
        actions,
        caughtErrors,
        dataset,
        getOpenLifecycleIds
    };
};
