import '../style/visual.less';
import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;
import FormattingModel = powerbi.visuals.FormattingModel;

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';

import { getDenebVisualState, useDenebVisualState } from './state';
import {
    handlePropertyMigration,
    bindPersistPropertiesHost,
    setReadModePersistSuppressed,
    VisualFormattingSettingsService,
    getVisualFormattingService
} from './lib/persistence';
import { isReportInReadMode } from './lib/state/display-mode';
import { VisualHostServices } from './lib/host';
import { toBoolean } from '@deneb-viz/utils/type-conversion';
import {
    logDebug,
    logHeading,
    logHost,
    logTimeEnd,
    logTimeStart
} from '@deneb-viz/utils/logging';
import { InteractivityManager } from './lib/interactivity';
import {
    getDenebState,
    type I18nLocale,
    updateFieldTracking
} from '@deneb-viz/app-core';
import type { SupportFieldConfiguration } from '@deneb-viz/data-core/support-fields';
import { VegaExtensibilityServices } from '@deneb-viz/vega-runtime/extensibility';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import {
    canFetchMoreFromDataview,
    getCategoricalDataViewFromOptions,
    getCategoricalRowCount,
    getMappedDataset,
    hasDataViewChanged,
    resolveDatasetUpdateAction,
    type DatasetUpdateAction
} from './lib/dataset';
import { I18N_TRANSLATIONS } from './i18n';
import { initializeStoreSynchronization } from './lib/state';
import {
    createCrossFilterApplyHandler,
    createCrossFilterClearHandler
} from './lib/vega-embed';
import { APPLICATION_NAME, APPLICATION_VERSION } from './lib/application';
import {
    handleTabWrapAround,
    shouldYieldToFocusScope
} from './lib/keyboard-focus';
import {
    createRenderingLifecycleCoordinator,
    type RenderingLifecycleCoordinator,
    type RenderingLifecycleId,
    type SafetyNetScheduler
} from './lib/rendering-lifecycle';

/**
 * Centralize/report developer mode from environment.
 */
const IS_DEVELOPER_MODE = toBoolean(process.env.PBIVIZ_DEV_MODE);

/**
 * Gate for the rendering-lifecycle coordinator's observer wiring.
 * When the dev-overlay env var is on, every coordinator event is
 * pushed into the visual store's bounded ring (the tally surface
 * consumed by `VisualUpdateHistoryOverlay`). When off, the observer
 * slot is left undefined and the coordinator's internal observe
 * call is a typed no-op — production builds pay no per-event
 * cost.
 */
const IS_LIFECYCLE_OBSERVER_ENABLED = toBoolean(process.env.PBIVIZ_DEV_OVERLAY);

/**
 * Bound (ms) after which the rendering-lifecycle safety-net checks an
 * armed id. If the id is still open at the bound the safety-net closes
 * it terminally (`renderingFinished`) — whether the render never began
 * (orphan) or began but never signalled completion (started-but-stuck).
 * Reaching the bound while still open means no other terminal fired, so
 * closing here is the only thing standing between the host and an
 * orphaned `renderingStarted`. (Before U5 an in-flight id was deferred
 * here; that left started-but-stuck renders relying on app.tsx's settle
 * timer as their accidental terminal — which H2 removed.)
 *
 * Known close paths that fall through to the safety-net today:
 *  - Incremental data-update path (`performIncrementalUpdate` in
 *    `packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx`)
 *    — Vega view is updated in place via `view.data()`, so
 *    `vega-embed.tsx`'s `onRenderingStarted` / `onRenderingFinished`
 *    never fire (those only fire on a full embed). Currently closes
 *    via safety-net; **U10 wires `onSuccess` / `onFailure` of
 *    `performIncrementalUpdate` through the coordinator's
 *    `*PendingRender` adapters so these close synchronously and the
 *    safety-net falls back to a true-orphan-only role.**
 *
 * U11's dev overlay will surface every safety-net tick so we can
 * observe whether any legitimate path exceeds 10s. If one does, the
 * fix lives in that path (close it synchronously / wire it through
 * the coordinator), not in raising this constant.
 */
const SAFETY_NET_BOUND_MS = 10_000;

/**
 * Reason string emitted to the host's `renderingFailed` when
 * {@link Deneb.destroy} tears the visual down with a render still in
 * flight (M8). Distinguishes a teardown-aborted render from a genuine
 * render error in host telemetry / the dev overlay.
 */
const VISUAL_DESTROYED_FAILURE_REASON =
    'Visual destroyed before render completed.';

/**
 * Real-`setTimeout` scheduler for the rendering-lifecycle coordinator.
 * Unit tests inject a synthetic scheduler that exposes the pending
 * callback directly; production uses this one.
 */
const renderingLifecycleScheduler: SafetyNetScheduler = {
    schedule: (callback) => {
        const handle = setTimeout(callback, SAFETY_NET_BOUND_MS);
        return {
            cancel: () => clearTimeout(handle)
        };
    }
};

/**
 * Inputs consumed by {@link Deneb.resolveDataset} and the private dispatch
 * handlers it calls. Built once per update by
 * {@link Deneb.gatherDatasetUpdateContext}. `isInitialSegment` is used by
 * the dispatcher only (initial-segment debug log); the other fields flow
 * into the handlers via the `context` argument. `rowsLoaded` is computed
 * in the dispatcher after the skip-return so the skip path does not pay
 * for the row count; handlers that need it receive it as a separate
 * argument.
 */
type DatasetUpdateContext = {
    action: DatasetUpdateAction;
    categorical: ReturnType<typeof getCategoricalDataViewFromOptions>;
    locale: I18nLocale;
    isInitialSegment: boolean;
    setDataset: ReturnType<typeof getDenebVisualState>['dataset']['setDataset'];
    setIsFetchingAdditional: ReturnType<
        typeof getDenebVisualState
    >['dataset']['setIsFetchingAdditional'];
};

/**
 * Run to indicate that the visual has started.
 */
IS_DEVELOPER_MODE && console.clear();
logHeading(`${APPLICATION_NAME}`);
logHeading(`Version: ${APPLICATION_VERSION}`, 12);
logDebug(`Developer Mode: ${IS_DEVELOPER_MODE}`);

export class Deneb implements IVisual {
    #applicationWrapper: HTMLElement;
    #root: ReturnType<typeof createRoot>;
    #host: powerbi.extensibility.visual.IVisualHost;
    #coordinator: RenderingLifecycleCoordinator;
    // Render-callback adapters built once in the constructor (see U9
    // wiring below). Stored as fields so the same function references
    // are passed to <App> on the initial render; React then forwards
    // them through the platform provider's `onRendering*` slots
    // unchanged across re-renders. App-core never sees the
    // coordinator itself.
    #onRenderingStartedAdapter: () => void;
    #onRenderingFinishedAdapter: () => void;
    // Distinct settle-close adapter (H2 / U5). app.tsx's settle timer
    // uses THIS one — routed to the coordinator's deferring
    // `closePendingRenderSettle` so a settle firing mid-render no-ops
    // instead of emitting `renderingFinished` early. It must NOT share
    // `#onRenderingFinishedAdapter`: that adapter is also the embed
    // path's real render-complete close and must stay terminal, or
    // every real close would defer to the 10s safety-net.
    #onSettleCloseAdapter: () => void;
    #onRenderingErrorAdapter: (error: Error) => void;
    // Root element captured up front (L5) so the construction-failure
    // path can still render a static error element even when a later
    // constructor step throws before `#applicationWrapper` is built.
    #hostElement: HTMLElement | undefined;
    // Keydown handler reference retained (M8) so `destroy()` can remove
    // the document-level listener that `bindTabCycling` attaches.
    #handleTabCycleKeydown: ((event: KeyboardEvent) => void) | undefined;
    // Construction-failure state (L5). When the constructor's catch
    // fires, `#coordinator` / `#root` may be undefined; `update()`
    // checks this flag at the top and routes to a degraded handler
    // instead of dereferencing a half-built visual.
    #constructionFailed = false;
    #constructionError: unknown;
    #constructionFailureRendered = false;

    constructor(options: VisualConstructorOptions) {
        logHost('Constructor has been called.', { options });
        try {
            const { host, element } = options;
            this.#host = host;
            // Capture the root element up front so the
            // construction-failure path (see `update()` /
            // `handleConstructionFailure`) can still render a static
            // error element even if a later constructor step throws.
            this.#hostElement = element;
            // Coordinator owns ALL host.eventService.rendering*
            // emission from this point forward. The host event
            // service is the structural emitter; the safety-net uses
            // real setTimeout in prod; the observer is gated by
            // PBIVIZ_DEV_OVERLAY so the dev overlay's tally surface
            // is fed without paying the per-event store-write cost in
            // production builds.
            this.#coordinator = createRenderingLifecycleCoordinator({
                emitter: host.eventService,
                scheduler: renderingLifecycleScheduler,
                // `logHost` is variadic; forwarding it directly lets
                // the coordinator's one-arg `log(message)` calls reach
                // the underlying `console.debug(...args)` cleanly. The
                // earlier `(message, detail) => logHost(message, detail)`
                // wiring forwarded `detail` unconditionally and printed
                // a literal `undefined` after every lifecycle line
                // (e.g. "[lifecycle] renderingStarted id=1 undefined").
                logger: logHost,
                // U11: forward every coordinator event into the
                // visual store's bounded ring so the dev overlay can
                // compute a live start-vs-close tally. The setter is
                // a stable closure created once when the store
                // hydrates, so capturing it via `.getState()` here
                // is safe — subsequent slice rebuilds do not replace
                // it. Left undefined when the env gate is off (the
                // coordinator's optional observer slot skips the
                // call entirely).
                observer: IS_LIFECYCLE_OBSERVER_ENABLED
                    ? useDenebVisualState.getState().updates
                          .recordLifecycleEvent
                    : undefined
            });
            // U9: render-callback adapters routed through the
            // coordinator. App-core never imports the coordinator —
            // these no-arg / one-arg adapters are constructed here
            // and passed as props to <App>, which threads them to
            // the platform-provider's `onRendering*` slots. The
            // pending-render binding is performed synchronously in
            // the dispatch handlers (see `handleNormalFinalise` and
            // `handleFetchMore`); React fires these adapters AFTER
            // the dispatch returns, by which point `pendingRenderId`
            // is set to this update's id.
            this.#onRenderingStartedAdapter = () =>
                this.#coordinator.markPendingRenderStarted();
            // Embed-path REAL render-complete close — terminal, closes
            // the pending render regardless of in-flight state.
            this.#onRenderingFinishedAdapter = () =>
                this.#coordinator.closePendingRender();
            // Settle-timer close (app.tsx) — DEFERS to the real close /
            // safety-net when a render is in flight (H2). Separate
            // reference so the embed path above stays terminal.
            this.#onSettleCloseAdapter = () =>
                this.#coordinator.closePendingRenderSettle();
            this.#onRenderingErrorAdapter = (error: Error) =>
                this.#coordinator.failPendingRender(error);
            const {
                dataset: { setSelectors },
                host: { setHost },
                interactivity: { setSelectionLimitExceeded }
            } = getDenebVisualState();
            const {
                i18n: { setLocale }
            } = getDenebState();
            setHost(host);
            VisualHostServices.bind(options);
            bindPersistPropertiesHost(host);
            InteractivityManager.bind({
                host,
                limitExceededCallback: setSelectionLimitExceeded,
                selectorUpdateCallback: setSelectors
            });
            setLocale({
                locale: host.locale as I18nLocale,
                translationExtensions: [I18N_TRANSLATIONS]
            });
            VegaExtensibilityServices.bind(host.colorPalette);
            VegaExtensibilityServices.setExpressionHandlers({
                onCrossFilterClear: createCrossFilterClearHandler(),
                onCrossFilterApply: createCrossFilterApplyHandler()
            });
            VisualFormattingSettingsService.bind(
                options.host.createLocalizationManager()
            );
            initializeStoreSynchronization();
            this.#applicationWrapper = document.createElement('div');
            this.#applicationWrapper.id = 'deneb-application-wrapper';
            element.appendChild(this.#applicationWrapper);
            this.handleSuppressOnObjectFormatting();
            this.bindTabCycling();
            this.#root = createRoot(this.#applicationWrapper);
            this.#root.render(
                createElement(App, {
                    host,
                    onRenderingStarted: this.#onRenderingStartedAdapter,
                    onRenderingFinished: this.#onRenderingFinishedAdapter,
                    onSettleClose: this.#onSettleCloseAdapter,
                    onRenderingError: this.#onRenderingErrorAdapter
                })
            );
            element.oncontextmenu = (ev) => {
                ev.preventDefault();
            };
        } catch (e) {
            // Construction failed (L5). Do NOT `console.error` — it is
            // banned on certified paths (see the note in `update()`'s
            // catch). Record the failure so `update()` short-circuits
            // into `handleConstructionFailure` instead of dereferencing
            // a half-built visual (`#coordinator` / `#root` may be
            // undefined here, which would otherwise make every later
            // `update()` throw a secondary TypeError). Forensic detail
            // goes to the dev-time log gate.
            this.#constructionFailed = true;
            this.#constructionError = e;
            logDebug('Error during visual construction.', { error: e });
        }
    }

    public update(options: VisualUpdateOptions) {
        // L5: if construction failed, the coordinator (and the React
        // root) may never have been built. Short-circuit BEFORE
        // touching `#coordinator` — otherwise this update, and every
        // one after it, throws a secondary TypeError on the undefined
        // coordinator and the visual stays permanently blank.
        // `handleConstructionFailure` emits `renderingFailed` directly
        // through the host event service and renders a static error
        // element instead.
        if (this.#constructionFailed) {
            this.handleConstructionFailure(options);
            return;
        }
        // The coordinator's `open()` is the FIRST statement inside the
        // try so `renderingStarted` is emitted before anything else can
        // throw (R1). If `open()` itself throws (the host throws on
        // `renderingStarted` emission), the catch routes to
        // `failCurrent()` which no-ops because the id was never
        // recorded — no orphan accumulates and the safety-net is never
        // armed for a never-opened id (`openId` stays `undefined`).
        let openId: RenderingLifecycleId | undefined;
        try {
            openId = this.#coordinator.open(options);
            logTimeStart('update');
            // Set the read-mode persist gate before anything in the update
            // path can call persistProperties / persistProjectProperties.
            // The migration code and the project-sync subscriber both observe
            // this flag and short-circuit while it is true, so a read-mode
            // update never writes back to the host regardless of what the
            // downstream slice mutations imply.
            const isReadMode = isReportInReadMode(options);
            setReadModePersistSuppressed(isReadMode);
            this.resolveUpdateOptions(options, isReadMode);
            logTimeEnd('update');
        } catch (e) {
            // Coordinator records the failure (host emission + observer
            // event for the dev overlay) and derives the reason from
            // the error. logDebug adds the forensic detail (stack /
            // structured payload) for dev-time inspection — the only
            // permitted surface beyond the cert-allowed host channel,
            // since console.error is forbidden in certified builds.
            this.#coordinator.failCurrent(e);
            logDebug('Error during visual update.', { error: e });
        } finally {
            // Arm the safety-net for this update's id. The safety-net
            // is the backstop for rendering paths: if React's async
            // render callback never fires (the embed got stuck, the
            // page navigated away, the view threw without surfacing),
            // the safety-net closes the id after a bounded wait so
            // the host doesn't see an orphan `renderingStarted`.
            //
            // - When the dispatch was a non-rendering path (skip,
            //   fetch-more success, recover — U8), `closeCurrent` has
            //   already fired and deleted the id from `openIds`;
            //   `armSafetyNet` looks up the id, finds nothing, and
            //   no-ops.
            // - When the dispatch was a rendering path (normal-
            //   finalise, fetch-more host-decline — U9), the id stays
            //   open, the safety-net is armed, the React render
            //   eventually calls `markPendingRenderStarted()` (so
            //   app.tsx's settle timer defers instead of closing
            //   in-flight work — H2), then `closePendingRender()` fires
            //   and cancels the safety-net handle as part of the close.
            //   If that real close never arrives, the safety-net closes
            //   the still-open id terminally at the bound.
            // - When `open()` itself threw (host rejected
            //   `renderingStarted`), `openId` stayed `undefined` and
            //   the guard skips arming.
            if (openId !== undefined) {
                this.#coordinator.armSafetyNet(openId);
            }
        }
    }

    /**
     * Tear the visual down cleanly (IVisual contract, M8). Power BI does
     * not expect `destroy()` to throw, so each step is isolated: a throw
     * in one does not prevent the others and none propagates out.
     *
     * Teardown guarantees (per the rendering-lifecycle coordinator
     * solution doc): no orphaned open lifecycle id and no `rendering*`
     * emission after destroy.
     *  - `failCurrent` fails any still-open id (a single terminal),
     *    cancels its armed safety-net handle, and deletes the id from
     *    the coordinator's map — so a late React render callback
     *    (`closePendingRender`) or a safety-net tick that fires after
     *    destroy finds nothing open and no-ops. When the render already
     *    completed there is no open id and `failCurrent` no-ops (no
     *    emission).
     *  - The document keydown listener added by `bindTabCycling` is
     *    removed so it cannot fire against a torn-down wrapper.
     *  - The React root is unmounted and the Vega view cleared so no
     *    stale view state survives into a subsequent visual instance.
     *
     * All references are read defensively (`?.`) because a failed
     * construction may leave `#coordinator` / `#root` /
     * `#handleTabCycleKeydown` undefined.
     */
    public destroy(): void {
        logHost('Destroy has been called.');
        try {
            this.#coordinator?.failCurrent(
                new Error(VISUAL_DESTROYED_FAILURE_REASON)
            );
        } catch (e) {
            logDebug('Error failing open lifecycle during destroy.', {
                error: e
            });
        }
        try {
            if (this.#handleTabCycleKeydown) {
                document.removeEventListener(
                    'keydown',
                    this.#handleTabCycleKeydown
                );
                this.#handleTabCycleKeydown = undefined;
            }
        } catch (e) {
            logDebug('Error removing keydown listener during destroy.', {
                error: e
            });
        }
        try {
            this.#root?.unmount();
        } catch (e) {
            logDebug('Error unmounting React root during destroy.', {
                error: e
            });
        }
        try {
            VegaViewServices.clearView();
        } catch (e) {
            logDebug('Error clearing Vega view during destroy.', { error: e });
        }
    }

    /**
     * Degraded-mode handler invoked from the top of `update()` when the
     * constructor failed (L5). The coordinator may never have been
     * constructed, so this bypasses it entirely: it emits
     * `renderingFailed` DIRECTLY through the host event service (so the
     * host sees a terminal for this update rather than waiting on a
     * render that will never come) and renders a minimal static error
     * element into the root element once. Best-effort throughout — the
     * host reference may be absent if the failure preceded its capture,
     * and this path must never itself throw. Emission is per-update
     * (truthful: the host asked us to render and we cannot); the error
     * element is rendered only once.
     */
    private handleConstructionFailure(options: VisualUpdateOptions): void {
        logDebug('Visual update called after construction failure.', {
            error: this.#constructionError
        });
        const reason =
            this.#constructionError instanceof Error
                ? this.#constructionError.message
                : String(this.#constructionError);
        try {
            this.#host?.eventService?.renderingFailed(options, reason);
        } catch (e) {
            logDebug(
                'Failed to emit renderingFailed after construction failure.',
                { error: e }
            );
        }
        this.renderConstructionFailureElement();
    }

    /**
     * Render a minimal, non-localized error element into the root
     * element exactly once. i18n and React may have failed to
     * initialize during a construction failure, so this uses plain DOM
     * and a static string (no store, no Fluent, no translation
     * catalog). Guarded so repeated `update()` calls after a
     * construction failure do not stack elements.
     */
    private renderConstructionFailureElement(): void {
        if (this.#constructionFailureRendered) return;
        if (!this.#hostElement) return;
        try {
            const errorElement = document.createElement('div');
            errorElement.className = 'deneb-construction-error';
            errorElement.setAttribute('role', 'alert');
            errorElement.textContent =
                'Deneb failed to initialize. Please reload the visual.';
            this.#hostElement.replaceChildren(errorElement);
            this.#constructionFailureRendered = true;
        } catch (e) {
            logDebug('Failed to render construction-failure element.', {
                error: e
            });
        }
    }

    private resolveUpdateOptions(
        options: VisualUpdateOptions,
        isReadMode: boolean
    ) {
        logDebug('Resolving update options...', { options, isReadMode });
        logTimeStart('resolveUpdateOptions');
        // Provide initial update options to store
        // TODO: we're side-loading these for now until we can refactor the Deneb app store and app to be less reliant
        const { setVisualUpdateOptions } =
            useDenebVisualState.getState().updates;
        setVisualUpdateOptions({ options, isDeveloperMode: IS_DEVELOPER_MODE });
        this.resolveLocale();
        const { settings } = getDenebVisualState();
        // `renderingStarted` is now emitted by the coordinator at the
        // top of `update()`'s try (see `Deneb.update`). Keeping it out
        // of this method satisfies R1 (start fires before any code
        // that can throw in the update body — including this method
        // itself).
        // Perform any necessary property migrations
        handlePropertyMigration(settings, isReadMode);
        // Data change or re-processing required?
        this.resolveDataset(options);
        logTimeEnd('resolveUpdateOptions');
    }

    /**
     * Resolve the dataset for the visual update, based on the current state and the incoming options.
     */
    private resolveDataset(options: VisualUpdateOptions) {
        const context = this.gatherDatasetUpdateContext(options);
        const { action, categorical, isInitialSegment } = context;

        if (action.kind === 'skip') {
            logDebug('Visual dataset has not changed. No need to process.');
            // Skip is a non-rendering dispatch — no async render will
            // follow to close this update's lifecycle. Close
            // synchronously here so the host sees a balanced
            // renderingStarted / renderingFinished pair (R2, AE1). If
            // a persist was issued earlier in this update (e.g. an
            // edit-mode migration), the host's follow-up update
            // closes on its own dispatch path — no special branch
            // needed here.
            this.#coordinator.closeCurrent();
            return;
        }

        logTimeStart('processDataset');
        const rowsLoaded = getCategoricalRowCount(categorical);
        if (isInitialSegment) {
            logDebug('Initial data segment.');
        }

        if (action.kind === 'fetch-more') {
            this.handleFetchMore(context, rowsLoaded);
            return;
        }

        // At this point `action.kind === 'finalise'` — `skip` returned
        // at the top of the method and `fetch-more` returned/threw
        // above. The switch below exhausts `action.reason`; a future
        // reason added to the union surfaces here at compile time via
        // the `never` assertion in `default`, preventing a silent
        // fall-through into the wrong setDataset semantics.
        switch (action.reason) {
            case 'recover-interrupted-fetch': {
                this.handleRecoverInterruptedFetch(context, rowsLoaded);
                return;
            }
            case 'normal': {
                this.handleNormalFinalise(context, rowsLoaded);
                return;
            }
            default: {
                const _exhaustive: never = action.reason;
                logTimeEnd('processDataset');
                throw new Error(
                    `Unhandled finalise reason: ${String(_exhaustive)}`
                );
            }
        }
    }

    /**
     * Handle the `fetch-more` dispatch action: flag the visual as fetching,
     * request the next segment from the host, and either return (segment
     * accepted) or fall through to a normal-finalise with the segments we
     * already have (host declined). Behaviour mirrors the original inline
     * branch verbatim — the defensive try/catch around `fetchMoreData` and
     * its rationale comment are preserved on the lines they originally sat on.
     */
    private handleFetchMore(
        context: DatasetUpdateContext,
        rowsLoaded: number
    ): void {
        const { categorical, locale, setDataset, setIsFetchingAdditional } =
            context;
        logDebug(
            `${rowsLoaded} row(s) loaded. Attempting to fetch more data...`
        );
        setIsFetchingAdditional({
            isFetchingAdditional: true,
            rowsLoaded
        });
        // Defensive try/catch: if the host throws synchronously from
        // fetchMoreData, the outer update() catch logs the failure
        // but the isFetchingAdditional flag we just set would stay
        // true forever — visual stuck on FetchingMessage with no
        // recovery short of a hard restart. Clear the flag before
        // re-throwing so subsequent updates can recover normally.
        let fetchSuccess: boolean;
        try {
            fetchSuccess = this.#host.fetchMoreData(true);
        } catch (e) {
            setIsFetchingAdditional({
                isFetchingAdditional: false,
                rowsLoaded
            });
            logTimeEnd('processDataset');
            throw e;
        }
        if (fetchSuccess) {
            logTimeEnd('processDataset');
            // Host accepted the segment — no render will follow for
            // this update; the next segment arrives as its own
            // `update()`. Close this update's lifecycle synchronously
            // so each segment update produces its own 1:1
            // started/finished pair (R8, AE2). Order: after the
            // `processDataset` timing close so the existing diagnostic
            // pairing is preserved.
            this.#coordinator.closeCurrent();
            return;
        }
        // Host declined the fetch — fall through to finalise/normal
        // semantics with the segments we have so far.
        logDebug('Host declined fetchMoreData. Finalising current dataset.');
        setIsFetchingAdditional({
            isFetchingAdditional: false,
            rowsLoaded
        });
        setDataset(getMappedDataset(categorical, locale));
        logTimeEnd('processDataset');
        // Rendering branch: bind the pending-render id BEFORE
        // returning so the React-side `onRendering*` callbacks
        // (fired async after Vega embeds and paints) route through
        // the coordinator's `*PendingRender` adapters and target the
        // correct id. Without this, the coordinator's id for this
        // update stays open, and the next `update()` supersede-fails
        // it (the U7/U8 transition behaviour).
        this.#coordinator.bindPendingRenderCurrent();
    }

    /**
     * Handle the `finalise: recover-interrupted-fetch` dispatch action: a
     * non-volatile update arrived while still flagged as fetching, so the
     * host has aborted the segmented Append chain. Preserve the existing
     * dataset slice (Power BI may have re-sent a reduced categorical that
     * would overwrite a fully-loaded dataset with that reduced payload);
     * only clear the stuck `isFetchingAdditional` flag so the loading
     * screen goes away. All inline rationale comments are preserved
     * verbatim on the lines they originally occupied.
     */
    private handleRecoverInterruptedFetch(
        context: DatasetUpdateContext,
        rowsLoaded: number
    ): void {
        const { setIsFetchingAdditional } = context;
        // A non-volatile update (typically a viewer↔editor or
        // focus-mode transition) arrived while still flagged
        // as fetching. Power BI has aborted the segmented
        // Append chain and will not honour a resume during
        // the transition.
        //
        // Critically, Power BI may also re-send a *reduced*
        // categorical during the transition (e.g. editor mode
        // resets segmented-fetch state and ships only the
        // initial window). Calling `setDataset(getMappedDataset(...))`
        // here would overwrite a fully-loaded dataset with
        // that reduced payload and silently lose rows.
        // Preserve the existing dataset slice; only clear the
        // stuck flag so the loading screen goes away.
        // Subsequent property persists, cross-filter events,
        // or real data changes will re-enter the normal
        // change-detection path on their own.
        //
        // Trade-off: if recovery fires before any setDataset
        // has run (cold-load fetch interrupted at the very
        // first segment), the user sees blank Vega rather
        // than partial data. Acceptable — blank-with-
        // recoverable beats wrong-data-without-recovery, and
        // a user action (refresh/filter) retriggers the fetch.
        //
        // rowsLoaded: preserve the slice's current value
        // (`Math.max` against the current update's count) so
        // we never shrink the displayed row count below what
        // actually sits in `dataset.values`. Power BI's
        // reduced restart payload would otherwise rewrite
        // rowsLoaded to e.g. 10K while the preserved values
        // still hold 27K rows.
        //
        // Bounded-invariant note: `hasDataViewChanged` (in
        // `src/lib/dataset/processing.ts`) returns its result
        // by mutating module-level `prev*` references first.
        // On the host-restart guard path the call returned
        // true and already updated the cache to the reduced
        // restart payload — so after the recovery branch
        // preserves `dataset.values`, the change-detection
        // cache and the slice deliberately diverge (cache
        // points at the 10K refs, values still hold 27K).
        // This is bounded and self-healing: any subsequent
        // update with the same reduced refs is correctly
        // skipped, and any subsequent update with new refs
        // triggers a fresh fetch chain that re-syncs the
        // slice. The lighter snapshot/restore alternative
        // would require exposing module-level cache state
        // from `processing.ts`; not worth the surface for an
        // invariant that doesn't manifest as user-visible
        // behaviour.
        logDebug(
            'Non-volatile update arrived while flagged as fetching. ' +
                'Escaping stuck-fetching state — preserving current dataset.'
        );
        const currentStateRowsLoaded = getDenebVisualState().dataset.rowsLoaded;
        setIsFetchingAdditional({
            isFetchingAdditional: false,
            rowsLoaded: Math.max(currentStateRowsLoaded, rowsLoaded)
        });
        logTimeEnd('processDataset');
        // Recover-interrupted-fetch is non-rendering — no setDataset
        // ran, the existing slice is preserved, and the visual will
        // re-enter the normal change-detection path on the next
        // update. Close this update's lifecycle synchronously so it
        // doesn't orphan a renderingStarted (R2, AE1's recover
        // variant).
        this.#coordinator.closeCurrent();
    }

    /**
     * Handle the `finalise: normal` dispatch action: no more data to
     * fetch, so process the current categorical into the dataset slice,
     * clear the fetching flag, and close the processing timing span.
     */
    private handleNormalFinalise(
        context: DatasetUpdateContext,
        rowsLoaded: number
    ): void {
        const { categorical, locale, setDataset, setIsFetchingAdditional } =
            context;
        logDebug('No more data to fetch. Processing dataset...');
        setIsFetchingAdditional({
            isFetchingAdditional: false,
            rowsLoaded
        });
        setDataset(getMappedDataset(categorical, locale));
        // Tracking is now only used for export (#486)
        // this.updateTracking();
        logTimeEnd('processDataset');
        // Rendering branch: bind the pending-render id BEFORE
        // returning. See the matching call in `handleFetchMore`'s
        // host-decline branch for the full rationale. Any future
        // rendering branch added to the dispatch MUST also call this.
        this.#coordinator.bindPendingRenderCurrent();
    }

    /**
     * Resolve all inputs required by {@link resolveDataset}'s dispatch: extract
     * the relevant state and settings, compute change detection over the
     * incoming categorical, and resolve which dispatch action to take. The
     * returned object carries only what the dispatch handlers consume
     * downstream (no intermediate values like `dataChanged` / `canFetchMore`).
     */
    private gatherDatasetUpdateContext(
        options: VisualUpdateOptions
    ): DatasetUpdateContext {
        const {
            dataset: {
                isFetchingAdditional,
                setDataset,
                setIsFetchingAdditional
            },
            settings
        } = getDenebVisualState();
        const {
            vega: {
                interactivity: {
                    enableHighlight: { value: enableHighlight },
                    enableSelection: { value: enableSelection }
                }
            }
        } = settings;
        const {
            i18n: { locale }
        } = getDenebState();
        const categorical = getCategoricalDataViewFromOptions(options);

        // Do a quick check of the data view to see if it should be processed, to avoid unnecessary processing/syncing
        const canFetchMore = canFetchMoreFromDataview(
            settings,
            options?.dataViews?.[0]?.metadata
        );
        // Always run change detection — interactivity setting changes (cross-filter,
        // cross-highlight) affect the processing plan and must trigger reprocessing
        // even when the data itself hasn't changed.
        const supportFieldConfig: SupportFieldConfiguration =
            getDenebState().project.supportFieldConfiguration ?? {};
        const consolidateFieldParameters =
            getDenebState().project.consolidateFieldParameters ?? true;

        const dataChanged = hasDataViewChanged(
            categorical,
            enableSelection,
            enableHighlight,
            supportFieldConfig,
            consolidateFieldParameters
        );
        const isInitialSegment =
            options.operationKind === VisualDataChangeOperationKind.Create;
        const action = resolveDatasetUpdateAction({
            dataChanged,
            canFetchMore,
            isFetchingAdditional,
            isInitialSegment
        });
        logDebug('Resolved dataset update action', {
            action,
            dataChanged,
            canFetchMore,
            isFetchingAdditional,
            isInitialSegment
        });
        return {
            action,
            categorical,
            locale,
            isInitialSegment,
            setDataset,
            setIsFetchingAdditional
        };
    }

    /**
     * Resolve the locale for the visual update, based on the host or the overridden value in the developer settings.
     */
    private resolveLocale() {
        logDebug('Resolving locale options...');
        const { settings } = getDenebVisualState();
        const { locale, setLocale } = getDenebState().i18n;
        const localeNext = IS_DEVELOPER_MODE
            ? (settings.developer.localization.locale.value as string)
            : locale;
        if (localeNext !== locale) {
            logDebug('Locale has changed. Updating...', {
                localeCurrent: locale,
                localeNext
            });
            setLocale({
                locale: localeNext as I18nLocale
            });
        }
    }

    /**'
     * Perform the necessary tracking updates for the visual data and spec.
     */
    private async updateTracking() {
        logDebug('[Visual Update] Updating tracking and tokens...');
        const { settings } = getDenebVisualState();
        const {
            vega: {
                output: {
                    jsonSpec: { value: spec }
                }
            }
        } = settings;
        const {
            fieldUsage: { dataset: trackedFieldsCurrent }
        } = getDenebState();
        updateFieldTracking(spec, trackedFieldsCurrent);
    }

    /**
     * Cycle Tab focus within the visual's own tabbable elements to prevent focus from
     * escaping the iframe into other visuals on the Power BI canvas. When the user
     * reaches the last tabbable element, Tab wraps to the first; Shift+Tab on the first
     * wraps to the last. Esc is not intercepted — Power BI handles exiting the visual.
     */
    private bindTabCycling() {
        // Retain the handler reference (M8) so `destroy()` can remove
        // this document-level listener; an anonymous inline handler
        // could never be removed and would leak across visual
        // teardown/re-create cycles.
        this.#handleTabCycleKeydown = (event) => {
            if (event.key !== 'Tab') return;
            // When an overlay that manages its own focus is present (modal
            // dialog, Fluent UI PopoverSurface, etc.), yield to it — the
            // document-level wrap-around must not interfere with the
            // overlay's own focus trap or focus management.
            if (shouldYieldToFocusScope()) return;
            if (
                handleTabWrapAround(
                    this.#applicationWrapper,
                    document.activeElement,
                    event.shiftKey
                )
            ) {
                event.preventDefault();
            }
        };
        document.addEventListener('keydown', this.#handleTabCycleKeydown);
    }

    /**
     * Ensure that double clicking on the application wrapper doesn't propagate to the host application (avoiding on-object formatting
     * from triggering in Desktop).
     */
    private handleSuppressOnObjectFormatting() {
        logDebug('Suppressing on object formatting...');
        this.#applicationWrapper.ondblclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
        };
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the objects
     * and properties you want to expose to the users in the property pane.
     *
     * This is the newer way of populating the properties pane, using the new-style formatting cards.
     */
    public getFormattingModel(): FormattingModel {
        logDebug('[start] getformattingModel');
        const { settings } = getDenebVisualState();
        const model =
            getVisualFormattingService().buildFormattingModel(settings);
        logDebug('[return] getFormattingModel', { model });
        return model;
    }
}
