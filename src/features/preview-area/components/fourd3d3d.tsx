import React, { useEffect } from 'react';
import { shallow } from 'zustand/shallow';

import store from '../../../store';

const MODIFIER = '%F0%9F%A6%89';
const CANCEL =
    'CihyZS1ydW4geW91ciBzcGVjaWZpY2F0aW9uIG9yIGNsaWNrIG9uIHRoZSBwcmV2aWV3IHRvIGRpc21pc3Mp';

export const FourD3D3D: React.FC = () => {
    const { height, width, logWarn, clearLog, setVisual4d3d3d } = store(
        (state) => ({
            height: state.visualSettings.stateManagement.viewport.viewportHeight
                .value,
            width: state.visualSettings.stateManagement.viewport.viewportWidth
                .value,
            clearLog: state.specification.clearLog,
            logWarn: state.specification.logWarn,
            setVisual4d3d3d: state.setVisual4d3d3d
        }),
        shallow
    );
    const handleDismiss = () => setVisual4d3d3d(false);
    useEffect(() => {
        clearLog();
        logWarn(
            `Something went wrong..? ${decodeURIComponent(MODIFIER)} ${atob(
                CANCEL
            )}`
        );
        return () => clearLog();
    }, []);
    return (
        <div
            style={{ width, height }}
            role='button'
            className='fourd3d3d'
            onClick={handleDismiss}
        />
    );
};
