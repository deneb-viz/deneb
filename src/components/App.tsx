import { VisualInterface } from '../features/interface';
import { logRender } from '@deneb-viz/utils/logging';

const App = () => {
    logRender('App');
    return <VisualInterface />;
};

export default App;
