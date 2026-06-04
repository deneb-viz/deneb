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
 * Bound (ms) after which the rendering-lifecycle safety-net checks an
 * armed id. If the id is still open and no render ever began, the
 * safety-net closes it as an orphan; if a render is in flight
 * (`renderStarted === true`), the close is deferred to the render's
 * own callback chain. Tuned generously against observed render timing
 * — 5 seconds is well beyond the cert-blocking orphan window while
 * staying short enough to surface a broken update path during dev.
 */
const SAFETY_NET_BOUND_MS = 5000;

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

    constructor(options: VisualConstructorOptions) {
        logHost('Constructor has been called.', { options });
        try {
            const { host } = options;
            this.#host = host;
            // Coordinator owns ALL host.eventService.rendering* emission
            // from this point forward. The host event service is the
            // structural emitter; the safety-net uses real setTimeout in
            // prod. U11 will inject an observer for the dev overlay.
            this.#coordinator = createRenderingLifecycleCoordinator({
                emitter: host.eventService,
                scheduler: renderingLifecycleScheduler,
                logger: (message, detail) => logHost(message, detail)
            });
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
            const { element } = options;
            this.#applicationWrapper = document.createElement('div');
            this.#applicationWrapper.id = 'deneb-application-wrapper';
            element.appendChild(this.#applicationWrapper);
            this.handleSuppressOnObjectFormatting();
            this.bindTabCycling();
            this.#root = createRoot(this.#applicationWrapper);
            this.#root.render(createElement(App, { host }));
            element.oncontextmenu = (ev) => {
                ev.preventDefault();
            };
        } catch (e) {
            console?.error('Error', e);
        }
    }

    public update(options: VisualUpdateOptions) {
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
            // TODO(U9): Arm the safety-net here once the async render
            // close paths in `src/app/app.tsx` route through the
            // coordinator instead of calling `host.eventService`
            // directly. Arming now would cause every successful render
            // to emit a duplicate `renderingFinished` ~5s after start
            // — the coordinator's safety-net would mistakenly classify
            // the id as an orphan (renderStarted is never flipped
            // until U9 adds the `onRenderingStarted` adapter), while
            // app.tsx has already emitted the host's terminal.
            //
            //     if (openId !== undefined) {
            //         this.#coordinator.armSafetyNet(openId);
            //     }
            //
            // The coordinator's `openIds` map holds at most one
            // entry (the active id) at any time — terminal paths
            // delete the entry, and supersede displaces the prior id
            // before minting the new one. The previously-noted
            // "accumulates until visual restart" concern was real
            // before deletion-on-terminal landed and no longer
            // applies; the only id that can linger at session end is
            // the very last update's id (never closed via coordinator
            // because app.tsx's direct host call doesn't route
            // through it until U9).
            void openId;
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
        document.addEventListener('keydown', (event) => {
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
        });
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
