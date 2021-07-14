import * as React from 'react';
import { Provider } from 'react-redux';

import MainInterface from './MainInterface';
import store from '../store';

const App = () => {
    return (
        <Provider store={store}>
            <MainInterface />
        </Provider>
    );
};

export default App;
