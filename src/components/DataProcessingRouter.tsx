import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;

import React from 'react';
import { Scrollbars } from 'react-custom-scrollbars-2';

import { useStoreProp, useStoreVisualSettings } from '../store';
import DataFetching from './status/DataFetching';
import VisualRender from './VisualRender';
import ApplyDialog from './modal/ApplyDialog';
import SplashInitial from './status/SplashInitial';
import { i18nValue } from '../core/ui/i18n';
import { getViewModeViewportStyles, zoomConfig } from '../core/ui/dom';
import { clearSelection } from '../core/interactivity/selection';
import { hideTooltip } from '../core/interactivity/tooltip';
import { TDataProcessingStage } from '../core/data';
import { TVisualMode } from '../core/ui';
import {
    getViewConfig,
    getViewDataset,
    getViewSpec,
    TSpecProvider,
    TSpecRenderMode
} from '../core/vega';
import { reactLog } from '../core/utils/logger';

const DataProcessingRouter: React.FC = () => {
    const datasetProcessingStage = useStoreProp<TDataProcessingStage>(
        'datasetProcessingStage'
    );
    const visualViewportReport = useStoreProp<IViewport>(
        'visualViewportReport'
    );
    const { enableTooltips, renderMode, provider } =
        useStoreVisualSettings()?.vega;
    const visualMode = useStoreProp<TVisualMode>('visualMode');
    const editorZoomLevel = useStoreProp<number>('editorZoomLevel');
    const { showViewportMarker } = useStoreVisualSettings()?.editor;
    const data = getViewDataset();
    const specification = getViewSpec();
    const config = getViewConfig();
    const handleMouseLeave = () => {
        hideTooltip();
    };
    const isEditor = visualMode === 'Editor';
    const zoomLevel = (isEditor && editorZoomLevel) || zoomConfig.default;
    reactLog(
        'Rendering [DataProcessingRouter]',
        datasetProcessingStage,
        visualMode
    );
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
                        <VisualRender
                            specification={specification}
                            config={config}
                            provider={provider as TSpecProvider}
                            enableTooltips={enableTooltips}
                            renderMode={renderMode as TSpecRenderMode}
                            data={data}
                        />
                        <ApplyDialog />
                    </div>
                </Scrollbars>
            );
        }
    }
};

export default DataProcessingRouter;
