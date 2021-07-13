import * as React from 'react';
import { useSelector } from 'react-redux';

import EditorInterface from './editor/EditorInterface';
import { state } from '../store';
import DataProcessingRouter from './DataProcessingRouter';
import SplashInitial from './status/SplashInitial';
import SplashReadOnly from './status/SplashReadOnly';
import SplashReadWrite from './status/SplashReadWrite';
import SplashNoSpec from './status/SplashNoSpec';

const MainInterface = () => {
    const { visualMode } = useSelector(state).visual;
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

export default MainInterface;
