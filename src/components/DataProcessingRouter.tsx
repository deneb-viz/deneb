import * as React from 'react';
import { useSelector } from 'react-redux';

import Debugger from '../Debugger';
import { state } from '../store';
import DataFetching from './status/DataFetching';
import VisualRender from './VisualRender';
import LandingPage from './status/LandingPage';

const DataProcessingRouter = () => {
    Debugger.log('Rendering component: [DataProcessingRouter]');
    const { dataProcessingStage, dataRowsLoaded, i18n, settings } = useSelector(
            state
        ).visual,
        { dataLimit } = settings;

    switch (dataProcessingStage) {
        case 'Initial': {
            return <LandingPage />;
        }
        case 'Fetching': {
            return (
                <DataFetching
                    i18n={i18n}
                    dataRowsLoaded={dataRowsLoaded}
                    dataLimit={dataLimit}
                />
            );
        }
        case 'Processing': {
            return <div>All rows retrieved. Processing visual...</div>;
        }
        case 'Processed': {
            return (
                <div id='renderedVisual'>
                    <VisualRender />
                </div>
            );
        }
    }
};

export default DataProcessingRouter;
