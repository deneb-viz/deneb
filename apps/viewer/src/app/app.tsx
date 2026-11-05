import { useEffect, useMemo, useRef } from 'react';
import { type View } from 'vega';

import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { logRender } from '@deneb-viz/utils/logging';
import {
    DenebProvider,
    DenebViewer,
    GatedDenebViewer,
    useDenebState,
    type ViewEventBinder
} from '@deneb-viz/app-core';
import {
    contextMenuHandler,
    crossFilterHandler,
    tooltipHandler,
    getVegaLoader,
    persistOnCreateFromTemplate,
    useDenebVisualState,
    FetchingMessage,
    SplashInitial,
    IS_VIEWPORT_GATE_OVERLAY_ENABLED,
    ViewportGateDebugOverlay,
    IS_VISUAL_UPDATE_HISTORY_OVERLAY_ENABLED,
    VisualUpdateHistoryOverlay,
    type VisualAppProps
} from '@deneb-viz/powerbi-host';
import { NotificationToaster } from '../features/toaster';
import { LandingPage, resolveLandingSteps } from '../features/status';
import {
    CreateSurface,
    isCreatePending,
    isTemplateReset
} from '../features/create';
import {
    closesRenderingSynchronously,
    hasDataFields,
    isReadMode,
    resolveSurface
} from './surface';

/**
 * Delay (ms) before the rendering-lifecycle settle close fires for an
 * update in viewer mode that did not trigger Vega's own callback chain.
 * Typical renders finish well under 200ms; 500ms gives a legitimate render
 * headroom while closing non-Vega-affecting property updates long before
 * the kernel's 10s safety net.
 *
 * The settle close DEFERS: `onSettleClose` no-ops while a render is in
 * flight, so a render slower than this bound is closed by its own embed
 * callback (or the safety net), never pre-empted mid-render.
 */
const RENDERING_MODE_SETTLE_MS = 500;

export const App = ({
    host,
    onRenderingStarted,
    onRenderingFinished,
    onSettleClose,
    onRenderingError
}: VisualAppProps) => {
    const mode = useDenebVisualState((state) => state.interface.mode);
    const visualUpdateOptions = useDenebVisualState(
        (state) => state.updates.options
    );
    const enableTooltips = useDenebVisualState(
        (state) => state.settings?.vega?.interactivity?.enableTooltips?.value
    );
    const multiSelectDelay = useDenebVisualState(
        (state) => state.settings?.vega?.interactivity?.tooltipDelay?.value
    );
    const persistedSpec = useDenebVisualState(
        (state) => state.settings?.vega?.output?.jsonSpec?.value
    );
    const storeSpec = useDenebState((state) => state.project.spec);
    const resetImport = useDenebState((state) => state.create.setMode);
    /**
     * Clears the import surface when the saved template is removed, so the
     * author starts from an empty import rather than the last template.
     * Every distinct saved value is recorded, whatever the update type.
     */
    const previousPersistedSpec = useRef(persistedSpec);
    useEffect(() => {
        if (isTemplateReset(previousPersistedSpec.current, persistedSpec)) {
            resetImport('import');
        }
        previousPersistedSpec.current = persistedSpec;
    }, [persistedSpec, resetImport]);
    const readMode = isReadMode(visualUpdateOptions);
    const surface = resolveSurface(
        mode,
        readMode,
        hasDataFields(visualUpdateOptions)
    );
    const hasTemplate = persistedSpec !== PROJECT_DEFAULTS.spec;
    const translate = useDenebState((state) => state.i18n.translate);
    const { launchUrl } = host;
    const vegaLoader = useMemo(
        () =>
            getVegaLoader({
                host,
                translations: {
                    hoverText: translate(
                        'PowerBI_Vega_Loader_Warning_HoverText'
                    ),
                    detailedText: translate(
                        'PowerBI_Vega_Loader_Warning_DetailedText'
                    )
                }
            }),
        [translate, host]
    );
    const pbiTooltipHandler = useMemo(
        () =>
            tooltipHandler({
                enabled: enableTooltips,
                multiSelectDelay
            }),
        [enableTooltips, multiSelectDelay]
    );
    /**
     * Power BI interactivity bound to the Vega view when it initializes.
     * Both handlers read the current dataset from the store when invoked,
     * so the binder list only changes with the translator.
     */
    const viewEventBinders = useMemo<ViewEventBinder[]>(
        () => [
            (view: View) => {
                view.addEventListener('contextmenu', contextMenuHandler());
            },
            (view: View) => {
                view.addEventListener('click', crossFilterHandler(translate));
            }
        ],
        [translate]
    );

    /**
     * Closes the pending rendering lifecycle for updates that won't reach
     * (or have already finished with) a Vega render.
     *
     *  - Renderless surfaces (everything except the viewer) close
     *    synchronously: Vega never embeds there, so there is no in-flight
     *    render to protect.
     *  - Viewer-mode updates that don't change Vega's inputs never fire the
     *    embed callbacks, so a settle timer closes them through the
     *    deferring `onSettleClose`.
     *
     * Effect cleanup clears the previous timer on every new update, so at
     * most one settle timer is in flight however many updates arrive. The
     * coordinator's exactly-once guard makes a late settle after a Vega
     * close a no-op.
     */
    useEffect(() => {
        if (closesRenderingSynchronously(surface)) {
            onRenderingFinished();
            return;
        }
        const settleId = window.setTimeout(() => {
            onSettleClose();
        }, RENDERING_MODE_SETTLE_MS);
        return () => {
            window.clearTimeout(settleId);
        };
    }, [visualUpdateOptions, surface, onRenderingFinished, onSettleClose]);

    const mainComponent = useMemo(() => {
        switch (surface) {
            case 'splash':
                return <SplashInitial />;
            case 'fetching':
                return <FetchingMessage />;
            case 'create':
            case 'add-fields':
            case 'landing': {
                const steps = resolveLandingSteps({
                    surface,
                    readMode,
                    hasTemplate
                });
                if (surface !== 'create') {
                    return <LandingPage steps={steps} />;
                }
                return isCreatePending(storeSpec, persistedSpec) ? (
                    <SplashInitial />
                ) : (
                    <CreateSurface
                        host={host}
                        renderLanding={(importAction) => (
                            <LandingPage
                                steps={steps}
                                importAction={importAction}
                            />
                        )}
                    />
                );
            }
            // The viewer is mounted by `<GatedDenebViewer />` alongside this
            // component.
            default:
                return null;
        }
    }, [surface, readMode, hasTemplate, persistedSpec, storeSpec, host]);
    logRender('App', surface);
    /**
     * Memoized so `DenebProvider` consumers keep a stable `platformProvider`
     * reference across renders that don't change any value it closes over.
     */
    const platformProvider = useMemo(
        () => ({
            embedContainerSetByHost: true,
            onCreateProject: persistOnCreateFromTemplate,
            onRenderingError,
            onRenderingFinished,
            onRenderingStarted,
            tooltipHandler: pbiTooltipHandler,
            vegaLoader,
            viewEventBinders,
            launchUrl
        }),
        [
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
            <GatedDenebViewer
                isViewerMode={surface === 'viewer'}
                isEditorMode={false}
            >
                <DenebViewer />
            </GatedDenebViewer>
            {mainComponent}
            <NotificationToaster />
            {IS_VISUAL_UPDATE_HISTORY_OVERLAY_ENABLED && (
                <VisualUpdateHistoryOverlay />
            )}
            {IS_VIEWPORT_GATE_OVERLAY_ENABLED && <ViewportGateDebugOverlay />}
        </DenebProvider>
    );
};
