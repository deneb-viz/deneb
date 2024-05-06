import React from 'react';

import { VisualInterface } from '../features/interface';
import { logRender } from '../features/logging';

const App = () => {
    logRender('App');
    return <VisualInterface />;
};

export default App;
