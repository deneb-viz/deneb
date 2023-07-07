import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import { AdvancedEditorInterface } from '../../interface';
import store from '../../../store';
import { ReportViewRouter } from './report-view-router';
import SplashInitial from '../../../components/status/SplashInitial';
import SplashReadOnly from '../../../components/status/SplashReadOnly';
import SplashReadWrite from '../../../components/status/SplashReadWrite';
import SplashNoSpec from '../../../components/status/SplashNoSpec';
import SelectionLimitMessageBar from '../../../components/status/SelectionLimitMessageBar';
import { logRender } from '../../logging';

export const VisualInterface = () => {
    const { visualMode } = store(
        (state) => ({
            visualMode: state.visualMode
        }),
        shallow
    );
    const mainComponent = useMemo(() => {
        switch (visualMode) {
            case 'SplashInitial':
                return <SplashInitial />;
            case 'SplashReadOnly':
                return <SplashReadOnly />;
            case 'SplashReadWrite':
                return <SplashReadWrite />;
            case 'DataNoSpec':
                return <SplashNoSpec />;
            case 'Editor':
                return <AdvancedEditorInterface />;
            case 'Standard':
                return <ReportViewRouter />;
        }
    }, [visualMode]);
    logRender('MainInterface', visualMode);
    return (
        <>
            {mainComponent}
            <SelectionLimitMessageBar />
        </>
    );
};
