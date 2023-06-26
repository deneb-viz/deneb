import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import DataFetching from '../../../components/status/DataFetching';
import { VegaContainer } from '../../vega-output';
import { ApplyChangesDialog } from '../../modal-dialog';
import SplashInitial from '../../../components/status/SplashInitial';
import store from '../../../store';
import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';

/**
 * Handles routing of the main visual display, when in report view.
 */
export const ReportViewRouter: React.FC = () => {
    const { datasetProcessingStage, visualMode } = store(
        (state) => ({
            datasetProcessingStage: state.datasetProcessingStage,
            editorZoomLevel: state.editorZoomLevel,
            showViewportMarker: state.visualSettings.editor.showViewportMarker,
            visualMode: state.visualMode,
            visualViewportReport: state.visualViewportReport
        }),
        shallow
    );
    const component = useMemo(() => {
        switch (datasetProcessingStage) {
            case 'Initial': {
                return <SplashInitial />;
            }
            case 'Fetching': {
                return <DataFetching />;
            }
            case 'Processing': {
                return (
                    <div>
                        {getI18nValue('Fetching_Data_Assistive_Processed')}
                    </div>
                );
            }
            case 'Processed': {
                return (
                    <>
                        <VegaContainer />
                        <ApplyChangesDialog />
                    </>
                );
            }
        }
    }, [datasetProcessingStage]);
    logRender('DataProcessingRouter', { datasetProcessingStage, visualMode });
    return component;
};
