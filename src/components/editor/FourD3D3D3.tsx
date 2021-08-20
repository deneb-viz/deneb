import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { fourd3d3d } from '../../store/visual';

const FourD3D3D3: React.FC = () => {
    Debugger.log('Rendering Component: [FixErrorDetails]...');
    const { viewModeViewport } = useSelector(state).visual,
        { width, height } = viewModeViewport,
        dispatch = useDispatch(),
        handleDismiss = () => {
            dispatch(fourd3d3d(false));
        };

    return (
        <div
            className='fourd3d3d'
            style={{ width, height }}
            role='button'
            onClick={handleDismiss}
        />
    );
};

export default FourD3D3D3;
