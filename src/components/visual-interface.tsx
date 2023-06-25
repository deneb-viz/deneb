import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import EditorInterface from './editor/EditorInterface';
import store from '../store';
import { ReportViewRouter } from './report-view-router';
import SplashInitial from './status/SplashInitial';
import SplashReadOnly from './status/SplashReadOnly';
import SplashReadWrite from './status/SplashReadWrite';
import SplashNoSpec from './status/SplashNoSpec';
import SelectionLimitMessageBar from './status/SelectionLimitMessageBar';
import { logRender } from '../features/logging';

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
                return <EditorInterface />;
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
