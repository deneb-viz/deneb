import powerbi from 'powerbi-visuals-api';
import { useEffect, useMemo, useState } from 'react';

import { logRender } from '@deneb-viz/utils/logging';
import { ReportViewRouter } from './report-view-router';
import { DenebApp, DenebProvider, useDenebState } from '@deneb-viz/app-core';
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

type AppProps = {
    host: powerbi.extensibility.visual.IVisualHost;
};

export const App = ({ host }: AppProps) => {
    const [isDownloadPermitted, setIsDownloadPermitted] = useState<
        boolean | undefined
    >(undefined);
    const mode = useDenebVisualState((state) => state.interface.mode);
    const { translate } = useDenebState((state) => ({
        translate: state.i18n.translate
    }));
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
                settingsPanePlatformComponent: <InteractivitySettings />,
                vegaLoader,
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
