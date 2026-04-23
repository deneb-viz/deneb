import powerbi from 'powerbi-visuals-api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type View } from 'vega';

import { logHost, logRender } from '@deneb-viz/utils/logging';
import { ReportViewRouter } from './report-view-router';
import {
    DenebProvider,
    useDenebState,
    type PlatformSearchContribution,
    type ViewEventBinder
} from '@deneb-viz/app-core';
import { DenebEditor } from '@deneb-viz/app-core/editor';
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

/**
 * Search contributions for each platform-injected AccordionItem in the
 * settings pane. One contribution per element in
 * `settingsPanePlatformComponent`, with `id` matching the React `key` so
 * the pane can filter and expand the corresponding element by id. Module
 * scope keeps the reference identity stable across renders — the
 * `useMemo` inside app-core's SettingsPane re-runs only when the value
 * reference changes.
 */
const platformSearchContributions: PlatformSearchContribution[] = [
    {
        id: 'semantic-model',
        heading: { key: 'Text_Settings_SemanticModel' },
        rows: [
            {
                id: 'consolidate-field-parameters',
                label: { key: 'Text_Setting_ConsolidateFieldParameters' },
                assistive: { key: 'Assistive_Text_ConsolidateFieldParameters' }
            }
        ]
    },
    {
        id: 'tooltips',
        heading: { key: 'PowerBI_Objects_Vega_Tooltips' },
        rows: [
            {
                id: 'enable-tooltips',
                label: { key: 'PowerBI_Objects_Vega_EnableTooltips' }
            }
        ]
    },
    {
        id: 'contextmenu',
        heading: { key: 'PowerBI_Objects_Vega_ContextMenu' },
        rows: [
            {
                id: 'enable-contextmenu',
                label: { key: 'PowerBI_Objects_Vega_EnableContextMenu' }
            },
            {
                id: 'enable-contextmenu-selector',
                label: {
                    key: 'PowerBI_Objects_Vega_EnableContextMenuSelector'
                }
            }
        ]
    },
    {
        id: 'crossfilter',
        heading: { key: 'PowerBI_Objects_Vega_CrossFiltering' },
        rows: [
            {
                id: 'enable-selection',
                label: { key: 'PowerBI_Objects_Vega_EnableSelection' }
            }
        ]
    },
    {
        id: 'crosshighlight',
        heading: { key: 'PowerBI_Objects_Vega_CrossHighlighting' },
        rows: [
            {
                id: 'enable-highlight',
                label: { key: 'PowerBI_Objects_Vega_EnableHighlight' }
            }
        ]
    }
];

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
                return <DenebEditor />;
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
                    <SemanticModelSettings key='semantic-model' />,
                    <TooltipSettings key='tooltips' />,
                    <ContextMenuSettings key='contextmenu' />,
                    <CrossFilterSettings key='crossfilter' />,
                    <CrossHighlightSettings key='crosshighlight' />
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
            {mainComponent}
            <NotificationToaster />
            <VisualUpdateHistoryOverlay />
        </DenebProvider>
    );
};
