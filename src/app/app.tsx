import powerbi from 'powerbi-visuals-api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type View } from 'vega';

import { logHost, logRender } from '@deneb-viz/utils/logging';
import { ReportViewRouter } from './report-view-router';
import {
    DenebApp,
    DenebProvider,
    useDenebState,
    type ViewEventBinder
} from '@deneb-viz/app-core';
import {
    FetchingMessage,
    LandingPage,
    SplashInitial
} from '../features/status';
import { InteractivitySettings } from '../features/settings';
import { NotificationToaster } from '../features/toaster';
import { VisualUpdateHistoryOverlay } from '../features/visual-update-history-overlay';
import { getVegaLoader } from '../lib/vega-embed';
import { useDenebVisualState } from '../state';
import {
    contextMenuHandler,
    crossFilterHandler,
    tooltipHandler
} from '../lib/interactivity';
import { type SelectionMode } from '@deneb-viz/powerbi-compat/interactivity';

type AppProps = {
    host: powerbi.extensibility.visual.IVisualHost;
};

export const App = ({ host }: AppProps) => {
    const [isDownloadPermitted, setIsDownloadPermitted] = useState<
        boolean | undefined
    >(undefined);
    const mode = useDenebVisualState((state) => state.interface.mode);
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
     * Create the Power BI-specific tooltip handler with all dependencies baked in.
     */
    const pbiTooltipHandler = useMemo(
        () =>
            tooltipHandler({
                enabled: enableTooltips,
                fields,
                multiSelectDelay,
                values
            }),
        [enableTooltips, fields, multiSelectDelay, values]
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
            case 'editor':
                return <DenebApp type='editor' />;
            case 'viewer':
                return <ReportViewRouter />;
        }
    }, [mode]);
    logRender('App', mode);
    return (
        <DenebProvider
            platformProvider={{
                isDownloadPermitted,
                onRenderingError,
                onRenderingFinished,
                settingsPanePlatformComponent: <InteractivitySettings />,
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
            {mainComponent}
            <NotificationToaster />
            <VisualUpdateHistoryOverlay />
        </DenebProvider>
    );
};
