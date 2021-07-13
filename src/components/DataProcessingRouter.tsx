import * as React from 'react';
import { useSelector } from 'react-redux';

import { state } from '../store';
import DataFetching from './status/DataFetching';
import VisualRender from './VisualRender';
import ApplyDialog from './modal/ApplyDialog';
import SplashInitial from './status/SplashInitial';
import { i18nValue } from '../core/ui/i18n';

const DataProcessingRouter = () => {
    const { dataProcessingStage } = useSelector(state).visual;

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
                <div id='renderedVisual'>
                    <VisualRender />
                    <ApplyDialog />
                </div>
            );
        }
    }
};

export default DataProcessingRouter;
