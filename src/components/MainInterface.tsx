import * as React from 'react';
import { useSelector } from 'react-redux';

import Debugger from '../Debugger';
import EditorInterface from './editor/EditorInterface';
import { state } from '../store';
import LandingPage from './status/LandingPage';
import DataProcessingRouter from './DataProcessingRouter';

const MainInterface = () => {
    Debugger.log('Rendering component: [MainInterface]');
    const { interfaceType } = useSelector(state).visual;
    switch (interfaceType) {
        case 'Landing': {
            Debugger.log('Landing page will be displayed.');
            return <LandingPage />;
        }
        case 'Edit': {
            Debugger.log('Advanced Editor will be displayed.');
            return <EditorInterface />;
        }
        default: {
            Debugger.log(
                'Delegating to DataProcessingRouter for main visual...'
            );
            return <DataProcessingRouter />;
        }
    }
};

export default MainInterface;
