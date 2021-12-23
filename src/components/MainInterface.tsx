import * as React from 'react';

import EditorInterface from './editor/EditorInterface';
import store from '../store';
import DataProcessingRouter from './DataProcessingRouter';
import SplashInitial from './status/SplashInitial';
import SplashReadOnly from './status/SplashReadOnly';
import SplashReadWrite from './status/SplashReadWrite';
import SplashNoSpec from './status/SplashNoSpec';
import SelectionLimitMessageBar from './status/SelectionLimitMessageBar';

const MainInterface = () => {
    const { visualMode } = store((state) => state),
        mainComponent = () => {
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
    return (
        <>
            {mainComponent()}
            <SelectionLimitMessageBar />
        </>
    );
};

export default MainInterface;
