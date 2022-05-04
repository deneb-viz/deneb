import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;

import React from 'react';
import { Scrollbars } from 'react-custom-scrollbars-2';

import { useStoreProp, useStoreVegaProp } from '../store';
import DataFetching from './status/DataFetching';
import VisualRender from './VisualRender';
import ApplyDialog from './modal/ApplyDialog';
import SplashInitial from './status/SplashInitial';
import { i18nValue } from '../core/ui/i18n';
import { getViewModeViewportStyles, zoomConfig } from '../core/ui/dom';
import { clearSelection, hidePowerBiTooltip } from '../features/interactivity';
import { TDataProcessingStage } from '../core/data';
import { TVisualMode } from '../core/ui';
import {
    getViewConfig,
    getViewDataset,
    getViewSpec,
    TSpecProvider,
    TSpecRenderMode
} from '../core/vega';
import { reactLog } from '../core/utils/reactLog';

const DataProcessingRouter: React.FC = () => {
    const datasetProcessingStage = useStoreProp<TDataProcessingStage>(
        'datasetProcessingStage'
    );
    const visualViewportReport = useStoreProp<IViewport>(
        'visualViewportReport'
    );
    const enableTooltips = useStoreVegaProp<boolean>('enableTooltips');
    const renderMode = useStoreVegaProp<TSpecRenderMode>('renderMode');
    const provider = useStoreVegaProp<TSpecProvider>('provider');
    const visualMode = useStoreProp<TVisualMode>('visualMode');
    const editorZoomLevel = useStoreProp<number>('editorZoomLevel');
    const showViewportMarker = useStoreProp<boolean>(
        'showViewportMarker',
        'visualSettings.editor'
    );
    const data = getViewDataset();
    const specification = getViewSpec();
    const config = getViewConfig();
    const handleMouseLeave = () => {
        hidePowerBiTooltip();
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
                            provider={provider}
                            enableTooltips={enableTooltips}
                            renderMode={renderMode}
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
