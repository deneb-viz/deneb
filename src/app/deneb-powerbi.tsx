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

export const DenebPowerbi = () => {
    const { mode } = useDenebState((state) => ({
        mode: state.interface.mode
    }));
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
                settingsPanePlatformComponent: <InteractivitySettings />
            }}
        >
            {mainComponent}
            <NotificationToaster />
            <VisualUpdateHistoryOverlay />
        </DenebProvider>
    );
};
