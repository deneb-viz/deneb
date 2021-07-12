export {
    canFetchMore,
    getCategoryColumns,
    getMappedDataset,
    handleDataFetch,
    isFetchMoreEnabled,
    validateDataViewMapping,
    validateDataViewRoles,
    IAugmentedMetadataField,
    IDataProcessingPayload,IDataViewFlags,
    TDataProcessingStage
};

import powerbi from 'powerbi-visuals-api';
import DataView = powerbi.DataView;
import DataViewCategorical = powerbi.DataViewCategorical;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumns = powerbi.DataViewValueColumns;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;
import DataViewSegmentMetadata = powerbi.DataViewSegmentMetadata;

import range from 'lodash/range';
import reduce from 'lodash/reduce';

import {
    dataLoadingComplete,
    recordDataWindowLoad,
    resetLoadingCounters,
    updateDataProcessingStage
} from '../../store/visualReducer';

import { getEmptyDataset, IVisualDataset } from '../dataset';
import { IVisualValueMetadata, IVisualValueRow } from '../dataset';
import { isFeatureEnabled } from '../features';
import { getState, store } from '../store';
import { createSelectionId, getSidString } from '../selection';
import { resolveVisualMetaToDatasetField } from '../template';

const isFetchMoreEnabled = isFeatureEnabled('fetchMoreData');

const canFetchMore = () => isFetchMoreEnabled && getState().visual.canFetchMore;

const getCategoryColumns = () => getState()?.visual?.categories || [];

const getMappedDataset = (categorical: DataViewCategorical): IVisualDataset => {
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
                dataValues = range(rowCount).map((r, ri) => {
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

const handleDataFetch = (options: VisualUpdateOptions) => {
    if (isFetchMoreEnabled) {
        handleDataLoad(options);
    } else {
        dispatchLoadingComplete();
    }
};

const validateDataViewMapping = (dataViews?: DataView[]) =>
    (dataViews?.length > 0 &&
        dataViews[0]?.categorical &&
        dataViews[0]?.metadata?.columns &&
        true) ||
    false;

const validateDataViewRoles = (
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

interface IAugmentedMetadataField {
    column: powerbi.DataViewMetadataColumn;
    source: string;
    sourceIndex: number;
}

interface IDataProcessingPayload {
    dataProcessingStage: TDataProcessingStage;
    canFetchMore: boolean;
}

interface IDataViewFlags {
    hasValidDataViewMapping: boolean;
    hasValidDataRoles: boolean;
    hasValidDataView: boolean;
}

type TDataProcessingStage = 'Initial' | 'Fetching' | 'Processing' | 'Processed';

export const castPrimitiveValue = (
    field: IAugmentedMetadataField,
    value: powerbi.PrimitiveValue
) => (field?.column.type.dateTime ? new Date(value.toString()) : value);

const dispatchResetLoadingCounters = () => {
    store.dispatch(resetLoadingCounters(true));
};

export const dispatchLoadingComplete = () => {
    store.dispatch(dataLoadingComplete());
};

const dispatchWindowLoad = (rowsLoaded: number) => {
    store.dispatch(recordDataWindowLoad(rowsLoaded));
};

export const encodeFieldForSpec = (displayName: string) =>
    displayName?.replace(/([\\".\[\]])/g, '_') || '';

export const getConsolidatedFields = (
    categories: DataViewCategoryColumn[],
    values: DataViewValueColumns
) => [
    ...(categories?.map((c, ci) => ({
        column: c.source,
        source: 'categories',
        sourceIndex: ci
    })) || []),
    ...(values?.map((v, vi) => ({
        column: v.source,
        source: 'values',
        sourceIndex: vi
    })) || [])
];

export const getConsolidatedMetadata = (fields: IAugmentedMetadataField[]) => {
    return reduce(
        fields,
        (result, c) => {
            const encodedName = encodeFieldForSpec(c.column.displayName);
            result[encodedName] = {
                ...c.column,
                ...{
                    isColumn: !c.column.isMeasure,
                    sourceIndex: c.sourceIndex,
                    templateMetadata: resolveVisualMetaToDatasetField(
                        c.column,
                        encodedName
                    )
                }
            };
            return result;
        },
        <IVisualValueMetadata>{}
    );
};

export const getConsolidatedValues = (
    categories: DataViewCategoryColumn[],
    values: DataViewValueColumns
) => [
    ...(categories?.map((c) => c.values) || []),
    ...(values?.map((v) => v.values) || [])
];

export const getDataRoleIndex = (
    fields: DataViewMetadataColumn[],
    role: string
) => fields?.findIndex((f) => f.roles[`${role}`]) || -1;

export const getDataRow = (
    fields: IAugmentedMetadataField[],
    values: powerbi.PrimitiveValue[][],
    index: number
) =>
    reduce(
        fields,
        (accumulator, f, fi) => {
            const rawValue = values[fi][index];
            if (f?.column.roles?.dataset) {
                accumulator[
                    encodeFieldForSpec(f.column.displayName)
                ] = castPrimitiveValue(f, rawValue);
            }
            return accumulator;
        },
        <IVisualValueRow>{}
    );

export const getRowCount = (categorical: DataViewCategorical) =>
    categorical?.categories?.[0]?.values?.length ||
    categorical?.values?.[0]?.values?.length ||
    0;

export const handleAdditionalWindows = (segment: DataViewSegmentMetadata) => {
    const { fetchMoreData } = getState().visual;
    (shouldFetchMore(segment) &&
        store.dispatch(
            updateDataProcessingStage({
                dataProcessingStage: 'Fetching',
                canFetchMore: fetchMoreData(true)
            })
        )) ||
        dispatchLoadingComplete();
};

export const handleCounterReset = (
    operationKind: VisualDataChangeOperationKind
) => {
    operationKind === VisualDataChangeOperationKind.Create &&
        dispatchResetLoadingCounters();
};

export const handleDataLoad = (options: VisualUpdateOptions) => {
    const dataView = options.dataViews[0],
        rowsLoaded = getRowCount(dataView?.categorical);
    handleCounterReset(options.operationKind);
    dispatchWindowLoad(rowsLoaded);
    handleAdditionalWindows(dataView?.metadata?.segment);
};

export const shouldFetchMore = (segment: DataViewSegmentMetadata): boolean =>
    segment &&
    getState().visual.settings.dataLimit.override &&
    getState().visual.canFetchMore;
