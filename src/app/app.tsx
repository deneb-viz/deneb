import { logRender } from '@deneb-viz/utils/logging';
import { DenebPowerbi } from './deneb-powerbi';

export const App = () => {
    logRender('App');
    return <DenebPowerbi />;
};
