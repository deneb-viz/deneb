import React, { useMemo } from 'react';
import { Scrollbars } from 'react-custom-scrollbars-2';
import { shallow } from 'zustand/shallow';

import DataFetching from './status/DataFetching';
import VisualRender from './VisualRender';
import { ApplyChangesDialog } from '../features/modal-dialog';
import SplashInitial from './status/SplashInitial';
import { i18nValue } from '../core/ui/i18n';
import { getViewModeViewportStyles, zoomConfig } from '../core/ui/dom';
import { clearSelection, hidePowerBiTooltip } from '../features/interactivity';
import { TSpecProvider, TSpecRenderMode, getViewDataset } from '../core/vega';
import store from '../store';
import { logRender } from '../features/logging';

const DataProcessingRouter: React.FC = () => {
    const {
        datasetHashValue,
        datasetProcessingStage,
        editorZoomLevel,
        enableTooltips,
        provider,
        renderMode,
        showViewportMarker,
        spec,
        visualMode,
        visualViewportReport
    } = store(
        (state) => ({
            datasetHashValue: state.dataset.hashValue,
            datasetProcessingStage: state.datasetProcessingStage,
            editorZoomLevel: state.editorZoomLevel,
            enableTooltips: state.visualSettings.vega.enableTooltips,
            provider: state.visualSettings.vega.provider as TSpecProvider,
            renderMode: state.visualSettings.vega.renderMode as TSpecRenderMode,
            spec: state.specification.spec,
            showViewportMarker: state.visualSettings.editor.showViewportMarker,
            visualMode: state.visualMode,
            visualViewportReport: state.visualViewportReport
        }),
        shallow
    );
    const data = useMemo(() => getViewDataset(), [datasetHashValue]);
    const handleMouseLeave = () => {
        hidePowerBiTooltip();
    };
    const isEditor = visualMode === 'Editor';
    const zoomLevel = (isEditor && editorZoomLevel) || zoomConfig.default;
    logRender('DataProcessingRouter', { datasetProcessingStage, visualMode });
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
                            specification={spec}
                            provider={provider}
                            enableTooltips={enableTooltips}
                            renderMode={renderMode}
                            data={data}
                        />
                        <ApplyChangesDialog />
                    </div>
                </Scrollbars>
            );
        }
    }
};

export default DataProcessingRouter;
