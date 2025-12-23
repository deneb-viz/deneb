import { useMemo } from 'react';

import { FetchingMessage, SplashInitial } from '../features/status';
import { logRender } from '@deneb-viz/utils/logging';
import { DenebApp } from '@deneb-viz/app-core';
import { useDenebVisualState } from '../state';

/**
 * Handles routing of the main visual display, when in report view.
 */
export const ReportViewRouter = () => {
    const mode = useDenebVisualState((state) => state.interface.mode);
    const component = useMemo(() => {
        switch (mode) {
            case 'initializing': {
                return <SplashInitial />;
            }
            case 'fetching': {
                return <FetchingMessage />;
            }
            default: {
                return <DenebApp type='viewer' />;
            }
        }
    }, [mode]);
    logRender('ReportViewRouter', { mode });
    return component;
};
