import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import { VegaContainer } from '../../vega-output';
import { FetchingMessage, SplashInitial } from '../../status';
import store from '../../../store';
import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';

/**
 * Handles routing of the main visual display, when in report view.
 */
export const ReportViewRouter: React.FC = () => {
    const { datasetProcessingStage, mode } = store(
        (state) => ({
            datasetProcessingStage: state.datasetProcessingStage,
            mode: state.interface.mode
        }),
        shallow
    );
    const component = useMemo(() => {
        switch (datasetProcessingStage) {
            case 'Initial': {
                return <SplashInitial />;
            }
            case 'Fetching': {
                return <FetchingMessage />;
            }
            case 'Processing': {
                return (
                    <div>
                        {getI18nValue('Fetching_Data_Assistive_Processed')}
                    </div>
                );
            }
            case 'Processed': {
                return <VegaContainer />;
            }
        }
    }, [datasetProcessingStage]);
    logRender('DataProcessingRouter', { datasetProcessingStage, mode });
    return component;
};
