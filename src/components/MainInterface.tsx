import React from 'react';

import EditorInterface from './editor/EditorInterface';
import { useStoreProp } from '../store';
import DataProcessingRouter from './DataProcessingRouter';
import SplashInitial from './status/SplashInitial';
import SplashReadOnly from './status/SplashReadOnly';
import SplashReadWrite from './status/SplashReadWrite';
import SplashNoSpec from './status/SplashNoSpec';
import SelectionLimitMessageBar from './status/SelectionLimitMessageBar';
import { TVisualMode } from '../core/ui';
import { reactLog } from '../core/utils/logger';

const MainInterface = () => {
    const visualMode = useStoreProp<TVisualMode>('visualMode');
    const mainComponent = () => {
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
                return <DataProcessingRouter />;
        }
    };
    reactLog('Rendering [MainInterface]', visualMode);
    return (
        <>
            {mainComponent()}
            <SelectionLimitMessageBar />
        </>
    );
};

export default MainInterface;
