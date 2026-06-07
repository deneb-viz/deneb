import powerbi from 'powerbi-visuals-api';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type View } from 'vega';

import { logRender } from '@deneb-viz/utils/logging';
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
import { VisualUpdateHistoryOverlay } from '../features/visual-update-history-overlay';
import { getVegaLoader } from '../lib/vega-embed';
import { useDenebVisualState } from '../state';
import {
    contextMenuHandler,
    crossFilterHandler,
    tooltipHandler
} from '../lib/interactivity';
import { persistOnCreateFromTemplate } from '../lib/persistence';
import { type SelectionMode } from '@deneb-viz/powerbi-compat/interactivity';
import { handlePersistBooleanProperty } from '../features/settings/helpers';

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
    onRenderingError: (error: Error) => void;
};

export const App = ({
    host,
    onRenderingStarted,
    onRenderingFinished,
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
    const fields = useDenebVisualState((state) => state.dataset.fields);
    const values = useDenebVisualState((state) => state.dataset.values);
    const visualUpdateOptions = useDenebVisualState(
        (state) => state.updates.options
    );
    const selectionMode = useDenebVisualState(
        (state) =>
            state.settings?.vega?.interactivity?.selectionMode
                ?.value as SelectionMode
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
        const dataset = { fields, values };

        // Context menu handler (right-click)
        binders.push((view: View) => {
            view.addEventListener('contextmenu', contextMenuHandler(dataset));
        });

        // Cross-filter handler (click for selection)
        binders.push((view: View) => {
            view.addEventListener(
                'click',
                crossFilterHandler(dataset, translate)
            );
        });

        return binders;
    }, [fields, values, selectionMode, translate]);

    // Ensure that download permissions are evaluated against the current tenant and sent to the core app
    useEffect(() => {
        if (host) {
            host.downloadService.exportStatus().then((status) => {
                const isDownloadPermitted =
                    status === powerbi.PrivilegeStatus.Allowed;
                setIsDownloadPermitted(isDownloadPermitted);
            });
        }
    }, [host]);

    /**
     * Close the pending lifecycle for updates that resolve to a
     * renderless display mode — landing, no-project, initializing,
     * fetching, and the two transition states. `bindPendingRenderCurrent`
     * fires in `handleNormalFinalise` / `handleFetchMore` host-decline
     * before the resolved display mode is known; for these modes Vega
     * never embeds, so `vega-embed.tsx`'s `onRenderingFinished` callback
     * never fires and the lifecycle would otherwise wait the full 10s
     * safety-net bound. Closing here makes the host's
     * `renderingFinished` arrive within ms of paint instead.
     *
     * The effect's deps include `visualUpdateOptions` (changes per
     * update — new reference is the per-update fingerprint) and `mode`
     * (changes on transitions). `onRenderingFinished` is a stable
     * reference from `src/index.ts` so it adds no spurious re-runs.
     * The coordinator's `closePendingRender` is idempotent — no-op
     * when no pending-render is bound or the bound id has already
     * closed — so firing this effect for an update that already
     * closed via another path (e.g. U8 skip) is safe.
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
        }
    }, [visualUpdateOptions, mode, onRenderingFinished]);

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
    return (
        <DenebProvider
            platformProvider={{
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
            }}
        >
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
            <VisualUpdateHistoryOverlay />
            {IS_VIEWPORT_GATE_OVERLAY_ENABLED && <ViewportGateDebugOverlay />}
        </DenebProvider>
    );
};
