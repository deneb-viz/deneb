import { useMemo } from 'react';

import { logRender } from '@deneb-viz/utils/logging';
import { ReportViewRouter } from './report-view-router';
import { DenebProvider, Editor, useDenebState } from '@deneb-viz/app-core';
import {
    FetchingMessage,
    LandingPage,
    SplashInitial
} from '../features/status';
import { InteractivitySettings } from '../features/settings';
import { NotificationToaster } from '../features/toaster';
import { VisualUpdateHistoryOverlay } from '../features/visual-update-history-overlay';
import { getVegaLoader } from '../lib/vega-embed';

export const DenebPowerbi = () => {
    const { mode, translate } = useDenebState((state) => ({
        mode: state.interface.mode,
        translate: state.i18n.translate
    }));
    const vegaLoader = useMemo(() => {
        return getVegaLoader({
            translations: {
                hoverText: translate('PowerBI_Vega_Loader_Warning_HoverText'),
                detailedText: translate(
                    'PowerBI_Vega_Loader_Warning_DetailedText'
                )
            }
        });
    }, [translate]);
    const mainComponent = useMemo(() => {
        switch (mode) {
            case 'Initializing':
                return <SplashInitial />;
            case 'Fetching':
                return <FetchingMessage />;
            case 'Landing':
            case 'NoSpec':
            case 'EditorNoData':
                return <LandingPage />;
            case 'Editor':
                return <Editor />;
            case 'View':
                return <ReportViewRouter />;
        }
    }, [mode]);
    logRender('VisualInterface', mode);
    return (
        <DenebProvider
            platformProvider={{
                settingsPanePlatformComponent: <InteractivitySettings />,
                vegaLoader
            }}
        >
            {mainComponent}
            <NotificationToaster />
            <VisualUpdateHistoryOverlay />
        </DenebProvider>
    );
};
