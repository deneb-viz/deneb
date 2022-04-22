import React from 'react';

import store from '../../../store';

export const FourD3D3D3: React.FC = () => {
    const { visualViewportReport, setVisual4d3d3d } = store((state) => state),
        { width, height } = visualViewportReport,
        handleDismiss = () => {
            setVisual4d3d3d(false);
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
