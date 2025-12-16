import { useMemo } from 'react';

import { FetchingMessage, SplashInitial } from '../features/status';
import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState, Viewer } from '@deneb-viz/app-core';

/**
 * Handles routing of the main visual display, when in report view.
 */
export const ReportViewRouter = () => {
    const { datasetProcessingStage, mode, translate } = useDenebState(
        (state) => ({
            datasetProcessingStage: state.datasetProcessingStage,
            mode: state.interface.mode,
            translate: state.i18n.translate
        })
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
                        {translate('PowerBI_Fetching_Data_Assistive_Processed')}
                    </div>
                );
            }
            case 'Processed': {
                return <Viewer />;
            }
        }
    }, [datasetProcessingStage]);
    logRender('DataProcessingRouter', { datasetProcessingStage, mode });
    return component;
};
