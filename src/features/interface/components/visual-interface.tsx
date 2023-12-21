import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import { AdvancedEditor } from '../../interface';
import store from '../../../store';
import { ReportViewRouter } from './report-view-router';
import { FetchingMessage, SplashInitial } from '../../status';
import { NotificationToaster } from '../../toaster';
import { logRender } from '../../logging';
import { LandingPage } from '../../status';
import { VisualUpdateHistoryOverlay } from './visual-update-history-overlay';

export const VisualInterface = () => {
    const { mode } = store(
        (state) => ({
            mode: state.interface.mode
        }),
        shallow
    );
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
                return <AdvancedEditor />;
            case 'View':
                return <ReportViewRouter />;
        }
    }, [mode]);
    logRender('VisualInterface', mode);
    return (
        <>
            {mainComponent}
            <NotificationToaster />
            <VisualUpdateHistoryOverlay />
        </>
    );
};
