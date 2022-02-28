import powerbi from 'powerbi-visuals-api';
import DataView = powerbi.DataView;
import DataViewCategorical = powerbi.DataViewCategorical;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewValueColumns = powerbi.DataViewValueColumns;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;
import DataViewSegmentMetadata = powerbi.DataViewSegmentMetadata;
import PrimitiveValue = powerbi.PrimitiveValue;

import { isFeatureEnabled } from '../utils/features';
import { getState } from '../../store';
import {
    TDataPointHighlightComparator,
    TDataPointSelectionStatus
} from '../interactivity';
import { hostServices } from '../services';
import { IAugmentedMetadataField } from '.';

/**
 * Convenience constant that confirms whether the `fetchMoreData` feature switch is enabled via features.
 */
export const isFetchMoreEnabled = isFeatureEnabled('fetchMoreData');

/**
 * Determines whether the visual can fetch more data, based on the feature switch and the corresponding flag in the store
 * (set by data processing methods).
 */
export const canFetchMore = () =>
    isFetchMoreEnabled && getState().datasetCanFetchMore;

/**
 * For a Power BI primitive, apply any data type-specific logic before returning a value that can work with the visual dataset.
 */
export const castPrimitiveValue = (
    field: IAugmentedMetadataField,
    value: PrimitiveValue
) => (field?.column.type.dateTime ? new Date(value?.toString()) : value);

/**
 * Ensure that the store counters are reset, ready for a new data load.
 */
const dispatchResetLoadingCounters = () => {
    getState().resetDatasetLoadInformation(true);
};

/**
 * Ensures that the store state is correct for a loaded dataset.
 */
const dispatchLoadingComplete = () => {
    getState().confirmDatasetLoadComplete();
};

/**
 * Updates the store for each window of the dataset loaded from the visual host.
 */
const dispatchWindowLoad = (rowsLoaded: number) => {
    getState().updateDatasetLoadInformation(rowsLoaded);
};

/**
 * Retrieve all `powerbi.DataViewCategoryColumn[]` entries from the visual's data view, which are available from Deneb's store.
 */
export const getCategoryColumns = () => getState().datasetCategories || [];

/**
 * Checks the supplied columns for the correct index of the content column, so that we can map it correctly later.
 */
const getDataRoleIndex = (fields: DataViewMetadataColumn[], role: string) =>
    fields?.findIndex((f) => f.roles[`${role}`]) || -1;

/**
 * Process the data view values to determine if any of them have a highlights array.
 */
export const getHighlightStatus = (values: DataViewValueColumns) =>
    values?.filter((v) => v.highlights).length > 0;

/**
 * Checks for valid `categorical` dataview and provides count of values.
 */
export const getRowCount = (categorical: DataViewCategorical) =>
    categorical?.categories?.[0]?.values?.length ||
    categorical?.values?.[0]?.values?.length ||
    0;

/**
 * Determine whether additional data can/should be loaded from the visual host, and manage this operation along with the
 * store state.
 */
const handleAdditionalWindows = (segment: DataViewSegmentMetadata) => {
    shouldFetchMore(segment)
        ? getState().updateDatasetProcessingStage({
              dataProcessingStage: 'Fetching',
              canFetchMore: hostServices.fetchMoreData(true)
          })
        : dispatchLoadingComplete();
};

/**
 * Ensure that the store loading counters are updated for the correct event in the visual workflow.
 */
const handleCounterReset = (operationKind: VisualDataChangeOperationKind) => {
    operationKind === VisualDataChangeOperationKind.Create &&
        dispatchResetLoadingCounters();
};

/**
 * For the supplied `powerbi.VisualUpdateOptions`, interrogate the data view and visual settings to ensure that data is loaded. This could be
 * capped to the window default, or via windowing if elibigle to do so.
 */
export const handleDataFetch = (options: VisualUpdateOptions) => {
    if (isFetchMoreEnabled) {
        handleDataLoad(options);
    } else {
        dispatchLoadingComplete();
    }
};

/**
 * For the supplied visual update options, ensure that all workflow steps are managed.
 */
const handleDataLoad = (options: VisualUpdateOptions) => {
    const dataView = options.dataViews[0],
        rowsLoaded = getRowCount(dataView?.categorical);
    handleCounterReset(options.operationKind);
    dispatchWindowLoad(rowsLoaded);
    handleAdditionalWindows(dataView?.metadata?.segment);
};

/**
 * For a field, determine if a highlight has been explicitly applied or not (similar to selection)
 */
export const resolveHighlightStatus = (
    hasHighlights: boolean,
    fieldValue: PrimitiveValue,
    comparatorValue: PrimitiveValue
): TDataPointSelectionStatus => {
    switch (true) {
        case !hasHighlights:
            return 'neutral';
        case hasHighlights && fieldValue === null && comparatorValue !== null:
            return 'off';
        default:
            return 'on';
    }
};

/**
 * For a field, determine its comparator value for highlight purposes.
 */
export const resolveHighlightComparator = (
    fieldValue: PrimitiveValue,
    comparatorValue: PrimitiveValue
): TDataPointHighlightComparator => {
    switch (true) {
        case fieldValue == comparatorValue:
            return 'eq';
        case comparatorValue < fieldValue:
            return 'lt';
        case comparatorValue > fieldValue:
            return 'gt';
        default:
            return 'neq';
    }
};

/**
 * Based on the supplied segment from the data view, plus store state and settings, determine if the visual host should be
 * instructed to request more data.
 */
const shouldFetchMore = (segment: DataViewSegmentMetadata): boolean =>
    segment &&
    getState().visualSettings.dataLimit.override &&
    getState().datasetCanFetchMore;

/**
 * Validates the data view, to confirm that we can get past the splash screen.
 */
export const validateDataViewMapping = (dataViews?: DataView[]) =>
    (dataViews?.length > 0 &&
        dataViews[0]?.categorical &&
        dataViews[0]?.metadata?.columns &&
        true) ||
    false;

/**
 * Validates supplied data roles, to allow us to proceed with normal workflow.
 */
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
