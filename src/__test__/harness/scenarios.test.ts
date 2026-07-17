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
    createPbiSupportFieldProvider: vi.fn(),
    buildFieldSourceMappings: vi.fn(() => [])
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

    it('safety-net terminally closes an in-flight render at the bound; a late embed close then no-ops (U5 true backstop)', async () => {
        const driver = await createDriver();
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(50) })
            })
        );
        driver.startRender();
        // Render began but never signalled completion. At the 10s bound
        // the safety-net is the TRUE backstop: it closes the still-open
        // id exactly once (before U5 it deferred here, leaving the id
        // open forever).
        driver.fireSafetyNets();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
        // A late embed completion after the bound finds the id gone.
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

// ─── Scenario 6: settle-timer close defers to the render (H2 / U5) ───────────
//
// The app-side 500ms settle timer (`app.tsx` → `onSettleClose`) is
// modelled by `driver.settleClose()`, which routes to the coordinator's
// DEFERRING `closePendingRenderSettle`. `driver.completeRender()` still
// models the embed-path terminal close. These scenarios pin the H2 fix:
// a settle firing mid-render must never emit `renderingFinished` early,
// yet a non-Vega-affecting update must still close promptly at the
// settle bound, and a started-but-stuck render must still reach exactly
// one terminal at the 10s safety-net bound.

describe('scenario: settle-timer close vs. in-flight render (H2 / U5)', () => {
    it('(a) non-Vega-affecting update → settle closes; exactly one renderingFinished, no open ids', async () => {
        const driver = await createDriver();
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(100) })
            })
        );
        // Rendering dispatch bound a pending render, but Vega's input
        // deps did not change (formatting-only update) so no embed
        // callback fires and no render starts. The settle timer is the
        // designed close path here.
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(0);
        driver.settleClose();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
        // Leftover async callbacks / safety-net are inert (exactly-once).
        driver.completeRender();
        driver.fireSafetyNets();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
    });

    it('(b) slow render (>500ms) → settle no-ops mid-render; renderingFinished only when the embed completes', async () => {
        const driver = await createDriver();
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(100) })
            })
        );
        // Render started but is slow — still in flight when the settle
        // timer fires.
        driver.startRender();
        driver.settleClose();
        // H2: the settle close must DEFER — no renderingFinished
        // mid-render. (This assertion is red on the pre-U5 code, where
        // the settle path closed unconditionally.)
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(0);
        expect(driver.getOpenLifecycleIds()).toHaveLength(1);
        // The embed finally completes → the real close emits the terminal.
        driver.completeRender();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
    });

    it('(c) render starts and completes before the bound → real close wins; the settle then no-ops', async () => {
        const driver = await createDriver();
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(100) })
            })
        );
        // Fast render: starts and completes before the 500ms timer.
        driver.startRender();
        driver.completeRender();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
        // The settle timer fires later against an already-closed id.
        driver.settleClose();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
    });

    it('(d) render starts but never completes → settle defers, safety-net is the sole terminal at the bound (exactly once)', async () => {
        const driver = await createDriver();
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(100) })
            })
        );
        driver.startRender();
        // Settle fires mid-render → defers (H2).
        driver.settleClose();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(0);
        expect(driver.getOpenLifecycleIds()).toHaveLength(1);
        // The embed never completes. The 10s safety-net is the true
        // backstop and closes the still-open id exactly once. (Red on
        // the pre-U5 code, where the safety-net deferred forever on a
        // started render and the id never closed.)
        driver.fireSafetyNets();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(0);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
        // Nothing left to fire.
        expect(driver.pendingSafetyNetCount()).toBe(0);
    });

    it('(e) render fails after the settle timer is scheduled → renderingFailed, never renderingFinished', async () => {
        const driver = await createDriver();
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(100) })
            })
        );
        driver.startRender();
        // Embed errors out — the failure terminal must win.
        driver.failRender(new Error('embed blew up'));
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(1);
        // The settle timer (scheduled earlier) fires against the now-
        // closed id → no-op; it must NOT convert a failure into a finish.
        driver.settleClose();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(0);
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(1);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
    });
});

// ─── Scenario 7: construction failure (L5) ────────────────────────────────────
//
// The Deneb class has heavy constructor side effects (React root, host
// services, i18n, store wiring), so construction failure is DRIVEN
// against the coordinator + host emitter and MIRRORED for the
// `update()` construction-failure guard (a faithful transcription of
// the top of `Deneb.update` + `Deneb.handleConstructionFailure`; see
// the driver). Reverting the mirror's guard turns these red — a
// `renderingStarted` is emitted and a lifecycle id opens; in production
// the reverted path additionally throws a secondary TypeError on the
// undefined coordinator (the audit's L5 failure mode).

describe('scenario: constructor failed → update() short-circuits (L5)', () => {
    it('emits a balanced renderingStarted/renderingFailed pair directly via the host without opening a lifecycle; no secondary throw', async () => {
        const driver = await createDriver();
        driver.failConstruction(new Error('bind chain exploded'));

        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(10) })
            })
        );

        // The coordinator's open() was never reached, so no lifecycle id
        // is opened — but a balanced renderingStarted → renderingFailed
        // pair is emitted DIRECTLY via the host event service so the host
        // never sees an unpaired terminal.
        expect(driver.getOpenLifecycleIds()).toEqual([]);
        expect(driver.host.countEmitterCalls('renderingStarted')).toBe(1);
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(1);
        const failed = driver.host.emitterCalls.filter(
            (c) => c.method === 'renderingFailed'
        );
        expect(failed[0].method === 'renderingFailed' && failed[0].reason).toBe(
            'bind chain exploded'
        );
        // No throw reached the mirrored try/catch; no safety-net armed.
        expect(driver.caughtErrors).toEqual([]);
        expect(driver.pendingSafetyNetCount()).toBe(0);
        // Static error element rendered.
        expect(driver.constructionErrorRenderCount()).toBe(1);
    });

    it('re-reports renderingFailed on every subsequent update but renders the error element only once', async () => {
        const driver = await createDriver();
        driver.failConstruction(new Error('boom'));
        const mk = () =>
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(5) })
            });

        driver.update(mk());
        driver.update(mk());
        driver.update(mk());

        // Each post-failure update emits its own balanced pair.
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(3);
        expect(driver.host.countEmitterCalls('renderingStarted')).toBe(3);
        expect(driver.constructionErrorRenderCount()).toBe(1);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
    });
});

// ─── Scenario 8: destroy() teardown (M8) ──────────────────────────────────────
//
// The coordinator + safety-net are REAL in the harness, so the
// "no orphaned id / no post-destroy emission" guarantees are genuinely
// exercised. The keydown-listener / React-root / view-clear steps are
// production-only side effects the driver records as spy counters (a
// faithful transcription of `Deneb.destroy`).

describe('scenario: destroy() teardown (M8)', () => {
    it('after a completed render: listener removed, root unmounted, view cleared, no further emissions', async () => {
        const driver = await createDriver();
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(100) })
            })
        );
        driver.startRender();
        driver.completeRender();
        const finishedBefore =
            driver.host.countEmitterCalls('renderingFinished');
        const failedBefore = driver.host.countEmitterCalls('renderingFailed');
        expect(finishedBefore).toBe(1);

        driver.destroy();

        // All production-only teardown side effects ran exactly once.
        expect(driver.teardown.keydownListenerRemoved).toBe(1);
        expect(driver.teardown.reactRootUnmounted).toBe(1);
        expect(driver.teardown.viewCleared).toBe(1);
        expect(driver.teardown.contextMenuHandlerReleased).toBe(1);
        expect(driver.teardown.applicationWrapperDetached).toBe(1);
        // Render already completed → failCurrent no-op → no new emission.
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(
            finishedBefore
        );
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(
            failedBefore
        );
        expect(driver.getOpenLifecycleIds()).toEqual([]);
        // Late callbacks / safety-nets after destroy stay inert.
        driver.completeRender();
        driver.fireSafetyNets();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(
            finishedBefore
        );
    });

    it('with a render in flight: open id failed exactly once, safety-net cancelled, no post-destroy renderingFinished', async () => {
        const driver = await createDriver();
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(100) })
            })
        );
        // Render started but never completes (in flight); safety-net armed.
        driver.startRender();
        expect(driver.getOpenLifecycleIds()).toHaveLength(1);
        expect(driver.pendingSafetyNetCount()).toBe(1);

        driver.destroy();

        // Open id failed exactly once (the teardown terminal); the armed
        // safety-net was cancelled as part of the fail.
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(1);
        expect(driver.pendingSafetyNetCount()).toBe(0);
        expect(driver.getOpenLifecycleIds()).toEqual([]);

        // Post-destroy: a late render-complete callback and any leftover
        // safety-net tick must NOT emit renderingFinished.
        driver.completeRender();
        driver.fireSafetyNets();
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(0);
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(1);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
    });

    it('full construct → update → destroy cycle leaves zero timers and zero open ids', async () => {
        const driver = await createDriver();
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(100) })
            })
        );
        driver.startRender();
        driver.completeRender();

        driver.destroy();

        expect(driver.pendingSafetyNetCount()).toBe(0);
        expect(driver.getOpenLifecycleIds()).toEqual([]);
        expect(driver.host.countEmitterCalls('renderingStarted')).toBe(1);
        expect(driver.host.countEmitterCalls('renderingFinished')).toBe(1);
        expect(driver.host.countEmitterCalls('renderingFailed')).toBe(0);
    });

    it('update() after destroy() is inert: no new renderingStarted, no open id', async () => {
        const driver = await createDriver();
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(100) })
            })
        );
        driver.startRender();
        driver.completeRender();
        driver.destroy();
        const startedBefore = driver.host.countEmitterCalls('renderingStarted');

        // Contract-forbidden, but a rapid re-mount can deliver an
        // update() after destroy(). It must not open the coordinator or
        // emit a fresh renderingStarted on the torn-down visual.
        driver.update(
            buildUpdateOptions({
                dataView: buildDataView({ categorical: buildCategorical(100) })
            })
        );
        expect(driver.host.countEmitterCalls('renderingStarted')).toBe(
            startedBefore
        );
        expect(driver.getOpenLifecycleIds()).toEqual([]);
    });
});
