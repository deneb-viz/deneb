import powerbi from 'powerbi-visuals-api';
import DataView = powerbi.DataView;
import DataViewCategorical = powerbi.DataViewCategorical;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import _ from 'lodash';

import { getEmptyDataset, IVisualDataset } from '../dataset/public';
import { isFeatureEnabled } from '../features/public';
import { getState } from '../store/public';
import { createSelectionId, getSidString } from '../selection/public';
import {
    dispatchLoadingComplete,
    getConsolidatedFields,
    getConsolidatedMetadata,
    getConsolidatedValues,
    getDataRoleIndex,
    getDataRow,
    getRowCount,
    handleDataLoad
} from './private';

export const isFetchMoreEnabled = isFeatureEnabled('fetchMoreData');

export const canFetchMore = () =>
    isFetchMoreEnabled && getState().visual.canFetchMore;

export const getCategoryColumns = () => getState()?.visual?.categories || [];

export const getMappedDataset = (
    categorical: DataViewCategorical
): IVisualDataset => {
    const categories = categorical?.categories,
        values = categorical?.values,
        columns = getConsolidatedFields(categories, values),
        fieldValues = getConsolidatedValues(categories, values),
        rowCount = getRowCount(categorical),
        empty = getEmptyDataset();
    if (rowCount === 0) {
        return empty;
    } else {
        try {
            const metadata = getConsolidatedMetadata(columns),
                dataValues = _.range(rowCount).map((r, ri) => {
                    const md = getDataRow(columns, fieldValues, ri),
                        identity = createSelectionId(metadata, categories, r);
                    return {
                        ...{
                            __identity__: identity,
                            __key__: getSidString(identity),
                            identityIndex: r
                        },
                        ...md
                    };
                });
            return {
                metadata,
                values: dataValues
            };
        } catch (e) {
            return empty;
        }
    }
};

export const handleDataFetch = (options: VisualUpdateOptions) => {
    if (isFetchMoreEnabled) {
        handleDataLoad(options);
    } else {
        dispatchLoadingComplete();
    }
};

export const validateDataViewMapping = (dataViews?: DataView[]) =>
    (dataViews?.length > 0 &&
        dataViews[0]?.categorical &&
        dataViews[0]?.metadata?.columns &&
        true) ||
    false;

export const validateDataViewRoles = (
    dataViews?: DataView[],
    dataRoles: string[] = []
) => {
    let hasValidDataRoles = false;
    dataRoles?.forEach((dr) => {
        hasValidDataRoles =
            getDataRoleIndex(dataViews[0].metadata.columns, dr) > -1 &&
            hasValidDataRoles;
    });
    return hasValidDataRoles;
};

export interface IAugmentedMetadataField {
    column: powerbi.DataViewMetadataColumn;
    source: string;
    sourceIndex: number;
}

export interface IDataProcessingPayload {
    dataProcessingStage: TDataProcessingStage;
    canFetchMore: boolean;
}

export type TDataProcessingStage =
    | 'Initial'
    | 'Fetching'
    | 'Processing'
    | 'Processed';
