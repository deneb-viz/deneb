import * as React from 'react';
import { Provider } from 'react-redux';

import MainInterface from './MainInterface';
import store from '../store';
import { ZoomLevelProvider } from '../context/zoomLevel';

const App = () => {
    return (
        <ZoomLevelProvider>
            <Provider store={store}>
                <MainInterface />
            </Provider>
        </ZoomLevelProvider>
    );
};

export default App;
