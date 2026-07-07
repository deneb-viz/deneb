// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// ─── Module mocks ─────────────────────────────────────────────────────────────
//
// The harness drives the REAL `resolveDatasetUpdateAction`, the REAL
// `hasDataViewChanged` (reference-based change detection) and the REAL
// rendering-lifecycle coordinator. `processing.ts` transitively imports
// the full dataset-mapping chain (app-core store, data-core support
// fields, interactivity), none of which participates in lifecycle
// orchestration — the mocks below isolate `hasDataViewChanged` exactly
// the way `src/lib/dataset/__test__/support-field-volatile.test.ts`
// (the established recipe) does. `./data-view` is deliberately NOT
// mocked: the driver needs the real decision function and helpers.

vi.mock('@deneb-viz/utils/logging', () => ({
    logTimeStart: vi.fn(),
    logTimeEnd: vi.fn(),
    logDebug: vi.fn()
}));
vi.mock('../../lib/dataset/drilldown', () => ({
    isDrilldownFeatureEnabled: vi.fn(() => false),
    resolveDrilldownComponents: vi.fn(),
    resolveDrilldownFlat: vi.fn()
}));
vi.mock('@deneb-viz/data-core/dataset', () => ({
    DATASET_DEFAULT_NAME: 'Values'
}));
vi.mock('@deneb-viz/data-core/field', () => ({
    DRILL_FIELD_FLAT: '__drillFlat__',
    DRILL_FIELD_NAME: '__drill__',
    ROW_INDEX_FIELD_NAME: '__row__'
}));
vi.mock('@deneb-viz/data-core/value', () => ({}));
vi.mock('@deneb-viz/data-core/support-fields', () => ({
    buildProcessingPlan: vi.fn(),
    buildDataRow: vi.fn(),
    resolveFieldDefaults: vi.fn()
}));
vi.mock('../../lib/dataset/values', () => ({
    getCastedPrimitiveValue: vi.fn(),
    getDatumValueEntriesFromDataview: vi.fn(() => [])
}));
vi.mock('../../lib/dataset/fields', () => ({
    getDatumFieldMetadataFromDataView: vi.fn(() => []),
    getDatumFieldsFromMetadata: vi.fn(() => ({})),
    getEncodedFieldName: vi.fn((n: string) => n),
    isSourceField: vi.fn(() => true)
}));
vi.mock('../../lib/dataset/support-field-provider', () => ({
    createPbiSupportFieldProvider: vi.fn()
}));
vi.mock('../../lib/dataset/support-field-migration', () => ({
    isLegacySpec: vi.fn(() => false)
}));
vi.mock('@deneb-viz/app-core', () => ({
    getDenebState: vi.fn(() => ({
        project: {
            spec: '{}',
            supportFieldConfiguration: {},
            setSupportFieldConfiguration: vi.fn(),
            setDenebMetaVersion: vi.fn(),
            denebMetaVersion: 2
        }
    }))
}));
vi.mock('../../lib/interactivity', () => ({
    InteractivityManager: { clearSelectors: vi.fn(), addRowSelector: vi.fn() },
    isCrossFilterPropSet: vi.fn(() => false),
    isCrossHighlightPropSet: vi.fn(() => false)
}));
vi.mock('mergician', () => ({ mergician: vi.fn((a: unknown) => a) }));

import { SUPERSEDED_FAILURE_REASON } from '../../lib/rendering-lifecycle/types';
import {
    createUpdateCycleDriver,
    type UpdateCycleDriverConfig
} from './update-cycle-driver';
import {
    buildCategorical,
    buildDataView,
    buildReducedRestartCreate,
    buildTransitionUpdateReusingDataView,
    buildUpdateOptions,
    FRACTIONAL_VIEWPORT,
    OPERATION_KIND_APPEND,
    OPERATION_KIND_CREATE,
    UPDATE_TYPE_DATA,
    UPDATE_TYPE_RESIZE_WITH_END
} from './fixtures';

// ─── Harness wiring ───────────────────────────────────────────────────────────

/**
 * `hasDataViewChanged` keeps its reference cache in module-level state,
 * so each scenario re-imports a fresh copy (the registered mocks above
 * survive `vi.resetModules`). The driver receives it through the
 * `hasDataChanged` seam with the interactivity/support-field flags held
 * constant — those inputs have their own focused suite.
 */
const createDriver = async (
    config: Omit<UpdateCycleDriverConfig, 'hasDataChanged'> = {}
) => {
    vi.resetModules();
    const { hasDataViewChanged } = await import('../../lib/dataset/processing');
    // Converge the detector's seed-state branches before the scenario
    // starts: on a fresh module the first call reports "changed" via
    // the consolidate-parameters seed and the second via the
    // interactivity-settings seed, regardless of references. Two
    // throwaway calls settle both (mirroring a visual that has already
    // processed its constructor-era updates), so scenario updates
    // exercise the pure reference-based detection the documented host
    // quirks hinge on.
    const throwaway = buildCategorical(1);
    hasDataViewChanged(throwaway, false, false, {}, true);
    hasDataViewChanged(throwaway, false, false, {}, true);
    return createUpdateCycleDriver({
        ...config,
        hasDataChanged: (categorical) =>
            hasDataViewChanged(categorical, false, false, {}, true)
    });
};

// ─── Scenario 1: single update lifecycle ──────────────────────────────────────

describe('scenario: single update → compile → render-start → close', () => {
    it('emits exactly one renderingStarted and one renderingFinished; no failures; no open ids', async () => {
        const driver = await createDriver();
        const options = buildUpdateOptions({
            dataView: buildDataView({ categorical: buildCategorical(100) }),
            operationKind: OPERATION_KIND_CREATE,
            type: UPDATE_TYPE_DATA
        });

        driver.update(options);
        // Rendering dispatch resolved: dataset committed, render pending.
        expect(driver.actions).toEqual([
            { kind: 'finalise', reason: 'normal' }
        ]);
        expect(driver.dataset.setDatasetCalls).toHaveLength(1);
        expect(driver.host.countEmitterCalls('renderingStarted')).toBe(1);
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(0);

        // Async render side completes.
        driver.startRender();
        driver.completeRender();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(0);
        expect(driver.getOpenLifecycleIds()).toEqual([]);

        // Safety-net was cancelled by the close — firing anything left
        // must not produce a second terminal (exactly-once).
        driver.fireSafetyNets();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
    });

    it('drives cleanly with the documented isInFocus: undefined host quirk on the options envelope', async () => {
        const driver = await createDriver();
        const options = buildUpdateOptions({
            dataView: buildDataView({ categorical: buildCategorical(10) }),
            operationKind: OPERATION_KIND_CREATE
        });
        // Fixture default IS the quirk — pin it so a fixture change
        // cannot silently drop the coverage.
        expect((options as { isInFocus?: boolean }).isInFocus).toBeUndefined();

        driver.update(options);
        driver.startRender();
        driver.completeRender();
        expect(driver.caughtErrors).toEqual([]);
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
    });

    it('safety-net closes an orphaned rendering update exactly once (render callbacks never fire)', async () => {
        const driver = await createDriver();
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(50) })
            })
        );
        expect(driver.pendingSafetyNetCount()).toBe(1);
        driver.fireSafetyNets();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
        // A late render callback after the safety-net close no-ops.
        driver.completeRender();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
    });

    it('safety-net defers while a render is in flight; the render close then lands exactly once', async () => {
        const driver = await createDriver();
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(50) })
            })
        );
        driver.startRender();
        driver.fireSafetyNets();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(0);
        driver.completeRender();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
    });
});

// ─── Scenario 2: segmented fetch (multi-update chain) ────────────────────────

describe('scenario: segmented fetch chain (Create → Append → terminal Append)', () => {
    it('each segment closes its own lifecycle 1:1; no supersedes; no orphaned ids', async () => {
        const driver = await createDriver({
            fetchMoreResponses: [true, true]
        });

        // Segment 1: Create with more segments advertised.
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({
                    categorical: buildCategorical(10000),
                    segment: true
                }),
                operationKind: OPERATION_KIND_CREATE
            })
        );
        expect(driver.actions.at(-1)).toEqual({ kind: 'fetch-more' });
        expect(driver.dataset.state.isFetchingAdditional).toBe(true);
        expect(driver.host.fetchMoreCalls).toHaveLength(1);

        // Segment 2: Append, still more advertised.
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({
                    categorical: buildCategorical(20000),
                    segment: true
                }),
                operationKind: OPERATION_KIND_APPEND
            })
        );
        expect(driver.actions.at(-1)).toEqual({ kind: 'fetch-more' });
        expect(driver.host.fetchMoreCalls).toHaveLength(2);

        // Terminal segment: no `segment` marker → normal finalise.
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({
                    categorical: buildCategorical(27000)
                }),
                operationKind: OPERATION_KIND_APPEND
            })
        );
        expect(driver.actions.at(-1)).toEqual({
            kind: 'finalise',
            reason: 'normal'
        });
        driver.startRender();
        driver.completeRender();

        // 3 updates → 3 started, 3 finished, 0 failed. Segment updates
        // closed synchronously so no supersede ever fired.
        expect(driver.host.countEmitterCalls('renderingStarted')).toBe(3);
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(3);
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(0);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
        expect(driver.dataset.state.isFetchingAdditional).toBe(false);
        expect(driver.dataset.state.rowsLoaded).toBe(27000);
        expect(driver.dataset.setDatasetCalls).toHaveLength(1);
    });

    it('host declines fetch-more → finalises with the rows already loaded (rendering path)', async () => {
        const driver = await createDriver({
            fetchMoreResponses: [false]
        });
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({
                    categorical: buildCategorical(30000),
                    segment: true
                }),
                operationKind: OPERATION_KIND_CREATE
            })
        );
        // Host declined — the driver fell through to finalise-with-
        // what-we-have and bound the pending render.
        expect(driver.dataset.state.isFetchingAdditional).toBe(false);
        expect(driver.dataset.setDatasetCalls).toHaveLength(1);
        driver.startRender();
        driver.completeRender();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
    });
});

// ─── Scenario 3: viewer↔editor transition mid-fetch (documented quirks) ──────

describe('scenario: viewer↔editor transition interrupts a segmented fetch', () => {
    it('quirk #1 — reference-equal DataView transition update while fetching → recovery, dataset slice preserved', async () => {
        const driver = await createDriver({
            fetchMoreResponses: [true]
        });
        // Start a segmented fetch (Create accepted → flag stuck true).
        const dataUpdate = buildUpdateOptions({
            dataView: buildDataView({
                categorical: buildCategorical(10000),
                segment: true
            }),
            operationKind: OPERATION_KIND_CREATE
        });
        driver.update(dataUpdate);
        expect(driver.dataset.state.isFetchingAdditional).toBe(true);

        // The transition update re-ships the SAME DataView objects
        // reference-equal (documented quirk) — real hasDataViewChanged
        // must report no change; the stuck flag routes to recovery.
        driver.update(buildTransitionUpdateReusingDataView(dataUpdate));
        expect(driver.actions.at(-1)).toEqual({
            kind: 'finalise',
            reason: 'recover-interrupted-fetch'
        });
        // Decision-table contract: recovery clears the transient flag
        // ONLY. No setDataset — the existing slice is preserved.
        expect(driver.dataset.state.isFetchingAdditional).toBe(false);
        expect(driver.dataset.setDatasetCalls).toHaveLength(0);
        // Both updates were non-rendering closes: 2 started, 2 finished.
        expect(driver.host.countEmitterCalls('renderingStarted')).toBe(2);
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(2);
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(0);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
        // Only the original data update requested a segment.
        expect(driver.host.fetchMoreCalls).toHaveLength(1);
    });

    it('quirks #3 + #4 — re-shipped reduced first segment (Create while fetching) → recovery preserves rowsLoaded via Math.max and never re-enters fetchMoreData', async () => {
        // Fully-loaded multi-segment dataset with the fetch flag stuck
        // true (the interrupted chain), as on the second editor-open.
        const fullyLoadedValues = Array.from({ length: 27000 }, (_, i) => ({
            __row: i
        }));
        const driver = await createDriver({
            fetchMoreResponses: [true],
            initialDatasetState: {
                isFetchingAdditional: true,
                rowsLoaded: 27000,
                values: fullyLoadedValues
            }
        });

        // Host restarts the chain with a REDUCED first segment.
        driver.update(buildReducedRestartCreate(10000));
        expect(driver.actions).toEqual([
            { kind: 'finalise', reason: 'recover-interrupted-fetch' }
        ]);
        // Host-restart guard: fetchMoreData must NOT be called (the
        // host accepts but never honours the restart — quirk #4).
        expect(driver.host.fetchMoreCalls).toHaveLength(0);
        // Decision-table contract: no setDataset (reduced payload would
        // clobber 27K rows); Math.max keeps rowsLoaded at the preserved
        // slice's count, not the reduced restart's 10K.
        expect(driver.dataset.setDatasetCalls).toHaveLength(0);
        expect(driver.dataset.state.values).toBe(fullyLoadedValues);
        expect(driver.dataset.state.rowsLoaded).toBe(27000);
        expect(driver.dataset.state.isFetchingAdditional).toBe(false);
        // Non-rendering close: balanced pair, nothing orphaned.
        expect(driver.host.countEmitterCalls('renderingStarted')).toBe(1);
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(0);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
    });

    it('post-recovery: a repeat of the same reduced payload is skipped (bounded cache/slice divergence is self-healing)', async () => {
        const driver = await createDriver({
            initialDatasetState: {
                isFetchingAdditional: true,
                rowsLoaded: 27000
            }
        });
        const reducedRestart = buildReducedRestartCreate(10000);
        driver.update(reducedRestart);
        expect(driver.actions.at(-1)).toEqual({
            kind: 'finalise',
            reason: 'recover-interrupted-fetch'
        });
        // Same reduced refs arrive again (flag now clear) → change
        // detection cache already points at them → skip.
        driver.update(reducedRestart);
        expect(driver.actions.at(-1)).toEqual({ kind: 'skip' });
        expect(driver.host.countEmitterCalls('renderingStarted')).toBe(2);
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(2);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
    });
});

// ─── Scenario 4: resize storm ─────────────────────────────────────────────────

describe('scenario: update storm (rapid updates racing unfinished renders)', () => {
    it('each newer update supersede-fails the prior open id; exactly-once emission holds end-to-end', async () => {
        const driver = await createDriver();
        // Fractional viewports throughout (Desktop snap-to-grid off).
        const storm = [1, 2, 3].map((n) =>
            buildUpdateOptions({
                dataView: buildDataView({
                    categorical: buildCategorical(100 + n)
                }),
                type: UPDATE_TYPE_RESIZE_WITH_END,
                viewport: {
                    width: FRACTIONAL_VIEWPORT.width + n * 0.37,
                    height: FRACTIONAL_VIEWPORT.height + n * 0.21
                }
            })
        );
        // Renders never complete between updates — every dispatch is a
        // rendering path whose pending render is displaced.
        storm.forEach((options) => driver.update(options));

        const failed = driver.host.emitterCalls.filter(
            (c) => c.method === 'renderingFailed'
        );
        expect(failed).toHaveLength(2);
        expect(
            failed.every(
                (c) =>
                    c.method === 'renderingFailed' &&
                    c.reason === SUPERSEDED_FAILURE_REASON
            )
        ).toBe(true);
        // Supersede targets the DISPLACED updates' options, in order.
        expect(failed[0].options).toBe(storm[0]);
        expect(failed[1].options).toBe(storm[1]);

        // Only the last update's render completes.
        driver.startRender();
        driver.completeRender();
        const finished = driver.host.emitterCalls.filter(
            (c) => c.method === 'renderingFinished'
        );
        expect(finished).toHaveLength(1);
        expect(finished[0].options).toBe(storm[2]);
        expect(driver.host.countEmitterCalls('renderingStarted')).toBe(3);
        expect(driver.getOpenLifecycleIds()).toEqual([]);

        // Stale callbacks and leftover safety-nets are inert.
        driver.completeRender();
        driver.fireSafetyNets();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(2);
    });
});

// ─── Scenario 5: update() throws ──────────────────────────────────────────────

describe('scenario: update() throws', () => {
    it('failCurrent routes the error to exactly one renderingFailed with the derived reason', async () => {
        const driver = await createDriver();
        driver.queueFault(new Error('boom'));
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(10) })
            })
        );
        expect(driver.caughtErrors).toHaveLength(1);
        expect(driver.host.countEmitterCalls('renderingStarted')).toBe(1);
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(0);
        const failed = driver.host.emitterCalls.filter(
            (c) => c.method === 'renderingFailed'
        );
        expect(failed).toHaveLength(1);
        expect(failed[0].method === 'renderingFailed' && failed[0].reason).toBe(
            'boom'
        );
        expect(driver.getOpenLifecycleIds()).toEqual([]);
        // The id already failed, so the finally-block arm no-opped and
        // nothing is left to fire.
        expect(driver.pendingSafetyNetCount()).toBe(0);
        driver.fireSafetyNets();
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(1);
    });

    it('fetchMoreData throwing synchronously clears the fetching flag before failing the lifecycle (no permanent FetchingMessage)', async () => {
        const driver = await createDriver({
            fetchMoreResponses: [new Error('host exploded')]
        });
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({
                    categorical: buildCategorical(5000),
                    segment: true
                }),
                operationKind: OPERATION_KIND_CREATE
            })
        );
        // Defensive-path contract: the flag set before the host call is
        // cleared on the throw path, then the update fails exactly once.
        expect(driver.dataset.state.isFetchingAdditional).toBe(false);
        expect(driver.dataset.setIsFetchingAdditionalCalls).toEqual([
            { isFetchingAdditional: true, rowsLoaded: 5000 },
            { isFetchingAdditional: false, rowsLoaded: 5000 }
        ]);
        expect(driver.caughtErrors).toHaveLength(1);
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(1);
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(0);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
    });
});
