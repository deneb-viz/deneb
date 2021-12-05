import * as React from 'react';
import { Scrollbars } from 'react-custom-scrollbars-2';

import store from '../store';
import DataFetching from './status/DataFetching';
import VisualRender from './VisualRender';
import ApplyDialog from './modal/ApplyDialog';
import SplashInitial from './status/SplashInitial';
import { i18nValue } from '../core/ui/i18n';
import { getViewModeViewportStyles, zoomConfig } from '../core/ui/dom';
import { clearSelection } from '../core/interactivity/selection';
import { hideTooltip } from '../core/interactivity/tooltip';

const DataProcessingRouter: React.FC = () => {
    const { datasetProcessingStage, visualViewportReport, visualMode } = store(
            (state) => state
        ),
        handleMouseLeave = () => {
            hideTooltip();
        },
        isEditor = visualMode === 'Editor',
        { editorZoomLevel, visualSettings } = store((state) => state),
        { showViewportMarker } = visualSettings?.editor,
        zoomLevel = (isEditor && editorZoomLevel) || zoomConfig.default;
    switch (datasetProcessingStage) {
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
                <Scrollbars>
                    <div
                        id='renderedVisual'
                        style={getViewModeViewportStyles(
                            visualViewportReport,
                            isEditor,
                            zoomLevel,
                            isEditor && showViewportMarker
                        )}
                        role='region'
                        onClick={clearSelection}
                        onMouseLeave={handleMouseLeave}
                    >
                        <VisualRender />
                        <ApplyDialog />
                    </div>
                </Scrollbars>
            );
        }
    }
};

export default DataProcessingRouter;
