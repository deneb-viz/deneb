import powerbi from 'powerbi-visuals-api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type View } from 'vega';

import { logHost, logRender } from '@deneb-viz/utils/logging';
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
import { RetainedDenebEditor } from '@deneb-viz/app-core/editor';
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
};

export const App = ({ host }: AppProps) => {
    const [isDownloadPermitted, setIsDownloadPermitted] = useState<
        boolean | undefined
    >(undefined);
    const mode = useDenebVisualState((state) => state.interface.mode);
    // Marker for the viewport-freeze investigation: detect the transition
    // INTO editor mode during render (before children commit) so the start
    // mark precedes the editor-mount layout effect. Adjusting state during
    // render is the React-blessed pattern for "react to a prop change".
    const [previousMode, setPreviousMode] = useState(mode);
    if (mode !== previousMode) {
        if (mode === 'editor' && previousMode !== 'editor') {
            markEditorOpenStart();
        }
        setPreviousMode(mode);
    }
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

    /**
     * Rendering lifecycle callbacks for Power BI visual host.
     * These call the event service directly rather than through powerbi-compat.
     */
    const onRenderingFinished = useCallback(() => {
        if (visualUpdateOptions) {
            logHost('Rendering event finished.');
            host.eventService.renderingFinished(visualUpdateOptions);
        }
    }, [host, visualUpdateOptions]);

    const onRenderingError = useCallback(
        (error: Error) => {
            if (visualUpdateOptions) {
                logHost('Rendering event failed:', error.message);
                host.eventService.renderingFailed(visualUpdateOptions);
            }
        },
        [host, visualUpdateOptions]
    );

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
            case 'viewer':
                return <ReportViewRouter />;
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
            <RetainedDenebEditor isEditorMode={mode === 'editor'} />
            {mainComponent}
            <NotificationToaster />
            <VisualUpdateHistoryOverlay />
        </DenebProvider>
    );
};
