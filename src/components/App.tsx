import * as React from 'react';
import { Provider } from 'react-redux';

import MainInterface from './MainInterface';
import store from '../store';
import Debugger from '../Debugger';

const App = () => {
    Debugger.log('Rendering component: [App]');
    return (
        <Provider store={store}>
            <MainInterface />
        </Provider>
    );
};

export default App;
