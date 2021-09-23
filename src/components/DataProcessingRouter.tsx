import * as React from 'react';
import { useSelector } from 'react-redux';

import { state } from '../store';
import DataFetching from './status/DataFetching';
import VisualRender from './VisualRender';
import ApplyDialog from './modal/ApplyDialog';
import SplashInitial from './status/SplashInitial';
import { i18nValue } from '../core/ui/i18n';
import { getViewModeViewportStyles } from '../core/ui/dom';
import { clearSelection } from '../core/interactivity/selection';
import { hideTooltip } from '../core/interactivity/tooltip';

interface IDataProcessingRouterProps {
    zoomLevel?: number;
}

const DataProcessingRouter: React.FC<IDataProcessingRouterProps> = ({
    zoomLevel
}) => {
    const { dataProcessingStage, viewModeViewport, visualMode, settings } =
            useSelector(state).visual,
        { showViewportMarker } = settings?.editor,
        handleMouseLeave = () => {
            hideTooltip();
        };
    switch (dataProcessingStage) {
        case 'Initial': {
            return <SplashInitial />;
        }
        case 'Fetching': {
            return <DataFetching />;
        }
        case 'Processing': {
            return <div>{i18nValue('Fetching_Data_Assistive_Processed')}</div>;
        }
        case 'Processed': {
            return (
                <div
                    id='renderedVisual'
                    style={getViewModeViewportStyles(
                        viewModeViewport,
                        visualMode === 'Editor',
                        zoomLevel || 100,
                        visualMode === 'Editor' && showViewportMarker
                    )}
                    role='region'
                    onClick={clearSelection}
                    onMouseLeave={handleMouseLeave}
                >
                    <VisualRender />
                    <ApplyDialog />
                </div>
            );
        }
    }
};

export default DataProcessingRouter;
