import powerbi from 'powerbi-visuals-api';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type View } from 'vega';

import { logRender } from '@deneb-viz/utils/logging';
import { resolveDownloadPermitted } from './download-permission';
import { ReportViewRouter } from './report-view-router';
import {
    DenebProvider,
    markEditorOpenStart,
    useDenebState,
    type ViewEventBinder
} from '@deneb-viz/app-core';
import {
    PLATFORM_SECTION_KEYS,
    platformSearchContributions
} from './platform-search-contributions';
import {
    GatedDenebViewer,
    RetainedDenebEditor
} from '@deneb-viz/app-core/editor';
import {
    FetchingMessage,
    LandingPage,
    SplashInitial
} from '../features/status';
import {
    InteractivityFooter,
    TooltipSettings,
    ContextMenuSettings,
    CrossFilterSettings,
    CrossHighlightSettings,
    SemanticModelSettings
} from '../features/settings';
import { NotificationToaster } from '../features/toaster';
import {
    IS_OVERLAY_ENABLED as IS_VIEWPORT_GATE_OVERLAY_ENABLED,
    ViewportGateDebugOverlay
} from '../features/viewport-gate-debug-overlay';
import {
    IS_OVERLAY_ENABLED as IS_UPDATE_HISTORY_OVERLAY_ENABLED,
    VisualUpdateHistoryOverlay
} from '../features/visual-update-history-overlay';
import { getVegaLoader } from '../lib/vega-embed';
import { useDenebVisualState } from '../state';
import {
    contextMenuHandler,
    crossFilterHandler,
    tooltipHandler
} from '../lib/interactivity';
import { persistOnCreateFromTemplate } from '../lib/persistence';
import { handlePersistBooleanProperty } from '../features/settings/helpers';

/**
 * Delay (ms) before the app-level rendering-lifecycle settle close
 * fires for updates in rendering modes (viewer / editor) that did
 * not trigger Vega's own callback chain. Typical Vega renders for
 * non-pathological specs complete in under 200ms; 500ms gives any
 * legitimate render comfortable headroom while closing
 * non-Vega-affecting property updates (which would otherwise wait
 * the full 10s safety-net bound) within half a second.
 *
 * The settle close is DEFERRING (H2 / U5): it fires through
 * `onSettleClose`, which no-ops when a render is already in flight
 * (`renderStarted === true`). So the 500ms bound is a lower bound on
 * "how long before we conclude no Vega render is coming", NOT a
 * deadline that can pre-empt a slow render — a render taking longer
 * than 500ms is closed by its own embed callback, not by this timer.
 * Idempotent against the U9/U10 close paths via the coordinator's
 * exactly-once guard.
 */
const RENDERING_MODE_SETTLE_MS = 500;

type AppProps = {
    host: powerbi.extensibility.visual.IVisualHost;
    /**
     * Rendering-lifecycle adapters built in `src/index.ts` and passed
     * down through the platform provider. App-core / vega-embed call
     * these without arguments (or with an `Error` for the error
     * variant); the adapters route to the coordinator's
     * `*PendingRender` methods. No `visualUpdateOptions` capture is
     * needed here — the pending-render binding is performed
     * synchronously in the visual's dispatch handlers BEFORE
     * `update()` returns, so by the time these async callbacks fire
     * the coordinator already knows which id they target.
     */
    onRenderingStarted: () => void;
    onRenderingFinished: () => void;
    /**
     * Settle-timer close (H2 / U5). DISTINCT from
     * {@link onRenderingFinished}: this adapter routes to the
     * coordinator's deferring `closePendingRenderSettle`, so if the
     * settle timer fires while a Vega render is still in flight it
     * NO-OPS (the real embed close or the safety-net owns the terminal)
     * instead of emitting `renderingFinished` mid-render. Used ONLY by
     * the settle timer below — never by the embed path, which keeps the
     * terminal {@link onRenderingFinished}.
     */
    onSettleClose: () => void;
    onRenderingError: (error: Error) => void;
};

export const App = ({
    host,
    onRenderingStarted,
    onRenderingFinished,
    onSettleClose,
    onRenderingError
}: AppProps) => {
    const [isDownloadPermitted, setIsDownloadPermitted] = useState<
        boolean | undefined
    >(undefined);
    const mode = useDenebVisualState((state) => state.interface.mode);
    // Marker for the viewport-freeze investigation: detect the
    // transition INTO editor mode and dispatch `markEditorOpenStart`.
    // Lives in `useEffect` rather than render-body so the module-
    // level mutation in the marker store is not triggered by a
    // discarded concurrent-mode render or by Strict Mode's double-
    // invocation. The previous-mode tracker is a ref because it is
    // only read from the post-commit effect; refs mutated during
    // effects (not during render) are concurrent-safe.
    //
    // Trade-off: child layout effects (e.g. `editor.tsx`'s
    // `markEditorOpenStage('editor-mount')`) run before parent
    // post-commit effects, so on a first cold open the
    // `editor-mount` stage may fire before this `start` and be
    // dropped by the marker module's "no active cycle" guard. This
    // is acceptable — the marker is dev-only instrumentation and
    // subsequent stages plus flush continue to work.
    const previousModeRef = useRef(mode);
    useEffect(() => {
        if (mode === 'editor' && previousModeRef.current !== 'editor') {
            markEditorOpenStart();
        }
        previousModeRef.current = mode;
    }, [mode]);
    const visualUpdateOptions = useDenebVisualState(
        (state) => state.updates.options
    );
    const enableTooltips = useDenebVisualState(
        (state) => state.settings?.vega?.interactivity?.enableTooltips?.value
    );
    const multiSelectDelay = useDenebVisualState(
        (state) => state.settings?.vega?.interactivity?.tooltipDelay?.value
    );
    const translate = useDenebState((state) => state.i18n.translate);
    const { launchUrl } = host;
    const vegaLoader = useMemo(() => {
        return getVegaLoader({
            host,
            translations: {
                hoverText: translate('PowerBI_Vega_Loader_Warning_HoverText'),
                detailedText: translate(
                    'PowerBI_Vega_Loader_Warning_DetailedText'
                )
            }
        });
    }, [translate, host]);

    /**
     * Create the Power BI-specific tooltip handler.
     */
    const pbiTooltipHandler = useMemo(
        () =>
            tooltipHandler({
                enabled: enableTooltips,
                multiSelectDelay
            }),
        [enableTooltips, multiSelectDelay]
    );

    /**
     * Build the array of view event binders for Power BI-specific interactivity.
     * Each binder closes over its required dependencies and binds event listeners
     * to the Vega view when it initializes.
     */
    const viewEventBinders = useMemo<ViewEventBinder[]>(() => {
        const binders: ViewEventBinder[] = [];

        // Both handlers read the current dataset from the store at invocation
        // time, so their identity stays stable across data changes and the
        // binder memo no longer needs fields/values (or selectionMode) as deps.

        // Context menu handler (right-click)
        binders.push((view: View) => {
            view.addEventListener('contextmenu', contextMenuHandler());
        });

        // Cross-filter handler (click for selection)
        binders.push((view: View) => {
            view.addEventListener('click', crossFilterHandler(translate));
        });

        return binders;
    }, [translate]);

    // Ensure that download permissions are evaluated against the current tenant and sent to the core app
    useEffect(() => {
        if (host) {
            resolveDownloadPermitted(
                () => host.downloadService.exportStatus(),
                powerbi.PrivilegeStatus.Allowed
            ).then(setIsDownloadPermitted);
        }
    }, [host]);

    /**
     * Close the pending lifecycle for updates that won't reach (or
     * have already finished with) a Vega render. Two cases:
     *
     *  1. **Renderless modes** — landing, no-project, initializing,
     *     fetching, and the two transition states. Vega never
     *     embeds in these modes so `vega-embed.tsx`'s callbacks
     *     never fire. Close synchronously when the effect runs.
     *
     *  2. **Rendering modes with no Vega-affecting change** — e.g.
     *     a "non-destructive" formatting property (editor theme,
     *     log level) routed through `handleNormalFinalise` →
     *     `bindPendingRenderCurrent`. Vega's input deps don't
     *     change → vega-embed's `useEffect` doesn't re-fire → no
     *     `onRenderingFinished` callback. The incremental update
     *     path may also short-circuit if values are deeply equal.
     *     A {@link RENDERING_MODE_SETTLE_MS} timer here closes these
     *     updates well before the 10s safety-net would.
     *
     * **Timer cancellation semantics — important.** The settle
     * timer is NOT cancelled when U9 (vega-embed) or U10
     * (performIncrementalUpdate) closes the pending render first.
     * Those close paths run inside app-core and don't reach back
     * into this effect; the only cancellation path is React's
     * built-in effect cleanup, which fires when `visualUpdateOptions`
     * / `mode` change for the next update.
     *
     * So the actual behavior is (H2 / U5 — the settle timer calls
     * `onSettleClose`, the coordinator's DEFERRING close variant, NOT
     * the terminal `onRenderingFinished`):
     *  - **Isolated fast render** (<{@link RENDERING_MODE_SETTLE_MS}):
     *    Vega closes the pending render via U9/U10 within typical
     *    render time (<200ms); the settle timer fires ~300ms later and
     *    is a no-op via the coordinator's exactly-once guard (the id
     *    was already deleted from the openIds map). One wasted timer
     *    per update — negligible.
     *  - **Isolated SLOW render** (>{@link RENDERING_MODE_SETTLE_MS}):
     *    the render is still in flight when the settle timer fires.
     *    Because `markPendingRenderStarted` has run, `onSettleClose`
     *    DEFERS (no-op) — it does NOT emit `renderingFinished`
     *    mid-render. The terminal is owned by Vega's own
     *    `onRenderingFinished` when the embed completes (or the 10s
     *    safety-net if it never does). This is the H2 fix: previously
     *    the settle timer closed unconditionally here, letting Power
     *    BI's export/snapshot capture pre-render content.
     *  - **Storm of N updates** (resize burst, live-data refresh):
     *    each new update's effect cleanup `clearTimeout`s the
     *    previous timer before scheduling a new one, so at most ONE
     *    settle timer is in flight at any moment regardless of N.
     *    React effect cleanup is the cap.
     *  - **Settle wins**: when no Vega render starts for this update
     *    (the non-Vega-affecting editor-theme-via-formatting-pane case
     *    this effect targets — `renderStarted` stays false), the timer
     *    fires and `onSettleClose` closes terminally via the
     *    coordinator. This is the designed close path for
     *    non-Vega-affecting updates in rendering modes.
     *
     * A first-class cancellation token keyed on the coordinator's
     * observer stream would eliminate the wasted-timer-per-update
     * cost, but the perf impact is negligible and the indirection
     * isn't worth it until U11's observer wiring is in place.
     *
     * Renderless modes still use the terminal `onRenderingFinished`
     * (closed synchronously): Vega never embeds in those modes, so
     * there is never an in-flight render to protect and the close is
     * unambiguously correct.
     *
     * `bindPendingRenderCurrent` fires in `handleNormalFinalise` /
     * `handleFetchMore` host-decline before the resolved display
     * mode is known; `onRenderingFinished` / `onSettleClose` are
     * stable references from `src/index.ts` so the effect's deps add
     * no spurious re-runs.
     */
    useEffect(() => {
        const isRenderlessMode =
            mode === 'initializing' ||
            mode === 'landing' ||
            mode === 'no-project' ||
            mode === 'fetching' ||
            mode === 'transition-viewer-editor' ||
            mode === 'transition-editor-viewer';
        if (isRenderlessMode) {
            onRenderingFinished();
            return;
        }
        const settleId = window.setTimeout(() => {
            onSettleClose();
        }, RENDERING_MODE_SETTLE_MS);
        return () => {
            window.clearTimeout(settleId);
        };
    }, [visualUpdateOptions, mode, onRenderingFinished, onSettleClose]);

    const mainComponent = useMemo(() => {
        switch (mode) {
            case 'initializing':
                return <SplashInitial />;
            case 'fetching':
                return <FetchingMessage />;
            case 'landing':
            case 'no-project':
                return <LandingPage />;
            // Render nothing during Power BI host transitions — the container is
            // actively resizing and anything mounted would appear at the wrong
            // viewport size. See display-mode.ts for the full update sequence.
            case 'transition-viewer-editor':
            case 'transition-editor-viewer':
                return null;
            case 'editor':
                // Editor mode is rendered by `<RetainedDenebEditor />`
                // alongside the main component so the editor tree is
                // retained across viewer↔editor toggles after the
                // first open. See packages/app-core/src/app/retained-deneb-editor.tsx.
                return null;
            // Viewer mode is rendered by `<GatedDenebViewer />`
            // alongside the main component so the viewer's Vega
            // mount can be gated until the iframe has physically
            // shrunk to the new viewer-mode width on editor → viewer
            // transitions. See packages/app-core/src/app/gated-deneb-viewer.tsx.
            case 'viewer':
                return null;
            default:
                return null;
        }
    }, [mode]);
    logRender('App', mode);
    /**
     * Memoized so `DenebProvider` consumers (context readers deep in the
     * component tree) keep a stable `platformProvider` reference across
     * `App` renders that don't touch any of the values this object
     * closes over. Without this, the object literal was rebuilt on every
     * render, breaking reference equality for anything comparing it
     * (e.g. a `useMemo`/`useEffect` dependency, or `React.memo` props
     * equality) further down the tree.
     */
    const platformProvider = useMemo(
        () => ({
            embedContainerSetByHost: true,
            isDownloadPermitted,
            onCreateProject: persistOnCreateFromTemplate,
            onEnableCrossHighlight: () =>
                handlePersistBooleanProperty('enableHighlight', true),
            onDisableCrossHighlight: () =>
                handlePersistBooleanProperty('enableHighlight', false),
            onRenderingError,
            onRenderingFinished,
            onRenderingStarted,
            settingsPaneFooter: <InteractivityFooter />,
            settingsPanePlatformComponent: [
                <SemanticModelSettings key={PLATFORM_SECTION_KEYS[0]} />,
                <TooltipSettings key={PLATFORM_SECTION_KEYS[1]} />,
                <ContextMenuSettings key={PLATFORM_SECTION_KEYS[2]} />,
                <CrossFilterSettings key={PLATFORM_SECTION_KEYS[3]} />,
                <CrossHighlightSettings key={PLATFORM_SECTION_KEYS[4]} />
            ],
            settingsPanePlatformSearchable: platformSearchContributions,
            tooltipHandler: pbiTooltipHandler,
            vegaLoader,
            viewEventBinders,
            launchUrl,
            downloadJsonFile: (content, filename, description) => {
                host.downloadService.exportVisualsContentExtended(
                    content,
                    filename,
                    'json',
                    description
                );
            }
        }),
        [
            host,
            isDownloadPermitted,
            launchUrl,
            onRenderingError,
            onRenderingFinished,
            onRenderingStarted,
            pbiTooltipHandler,
            vegaLoader,
            viewEventBinders
        ]
    );
    return (
        <DenebProvider platformProvider={platformProvider}>
            <RetainedDenebEditor
                isEditorMode={mode === 'editor'}
                hostViewportWidth={visualUpdateOptions?.viewport?.width}
                hostViewportHeight={visualUpdateOptions?.viewport?.height}
            />
            <GatedDenebViewer
                isViewerMode={mode === 'viewer'}
                isEditorMode={mode === 'editor'}
            >
                <ReportViewRouter />
            </GatedDenebViewer>
            {mainComponent}
            <NotificationToaster />
            {IS_UPDATE_HISTORY_OVERLAY_ENABLED && <VisualUpdateHistoryOverlay />}
            {IS_VIEWPORT_GATE_OVERLAY_ENABLED && <ViewportGateDebugOverlay />}
        </DenebProvider>
    );
};
