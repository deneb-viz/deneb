import powerbi from 'powerbi-visuals-api';
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;
import DataViewMetadata = powerbi.DataViewMetadata;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import Debugger, { standardLog } from '../Debugger';
import DataLimitSettings from '../properties/DataLimitSettings';
import store from '../store';
import {
    recordDataWindowLoad,
    resetLoadingCounters,
    updateDataProcessingStage,
    dataLoadingComplete
} from '../store/visualReducer';
import { dataViewService } from '.';
import { IDataLoadingService } from '../types';
import { isFetchMoreEnabled  } from '../api/dataView';

const owner = 'DataLimitService';

export class DataLoadingService implements IDataLoadingService {
    canFetchMore: boolean = false;
    private featureIsEnabled = isFetchMoreEnabled;

    @standardLog({ profile: true, owner })
    handleDataFetch(
        options: VisualUpdateOptions,
        settings: DataLimitSettings,
        host: IVisualHost
    ) {
        Debugger.log('Data Limit Check/Fetch');

        if (this.featureIsEnabled) {
            Debugger.log('Feature enabled. Attempting...');
            const dataView = options.dataViews[0],
                rowsLoaded = dataViewService.getRowCount(dataView?.categorical),
                { dataWindowsLoaded } = store.getState().visual;
            if (
                options.operationKind === VisualDataChangeOperationKind.Create
            ) {
                Debugger.log('New data view (or first window).');
                this.canFetchMore = true;
                store.dispatch(resetLoadingCounters());
            } else {
                Debugger.log('Subsequent window.');
            }
            store.dispatch(recordDataWindowLoad(rowsLoaded));

            Debugger.log(
                `${rowsLoaded} row(s) currently available in the data view.`
            );
            if (this.shouldFetchMore(dataView?.metadata, settings)) {
                Debugger.log(
                    'Not all data loaded. Loading more (if we can)...'
                );
                Debugger.log(
                    `We have loaded ${dataWindowsLoaded} times so far.`
                );
                store.dispatch(updateDataProcessingStage('Fetching'));
                this.canFetchMore = host.fetchMoreData(true);
            } else {
                Debugger.log(`We've got all the data we can get!`);
                Debugger.log(`${dataWindowsLoaded} window(s)`);
                this.canFetchMore = false;
                store.dispatch(dataLoadingComplete());
            }
        } else {
            Debugger.log('Skipping fetch of additional data.');
            store.dispatch(updateDataProcessingStage('Processing'));
        }
    }

    /**
     * Confirms whether we should attempt to do the additional fetch or not, based on config and the data view metadata.
     */
    @standardLog()
    private shouldFetchMore(
        metadata: DataViewMetadata,
        settings: DataLimitSettings
    ): boolean {
        Debugger.log('Checking whether we should fetch more data or not...');
        return metadata.segment && settings.override && this.canFetchMore;
    }
}
