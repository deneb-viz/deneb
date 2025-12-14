import { useMemo } from 'react';

import { ReportViewRouter } from './report-view-router';
import { FetchingMessage, SplashInitial } from '../../status';
import { NotificationToaster } from '../../toaster';
import { LandingPage } from '../../status';
import { logRender } from '@deneb-viz/utils/logging';
import { VisualUpdateHistoryOverlay } from '../../visual-update-history-overlay';
import { DenebProvider, Editor, useDenebState } from '@deneb-viz/app-core';
import { InteractivitySettings } from '../../settings';

export const VisualInterface = () => {
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
