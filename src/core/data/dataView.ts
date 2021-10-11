export {
    canFetchMore,
    getCategoryColumns,
    getMappedDataset,
    handleDataFetch,
    isFetchMoreEnabled,
    validateDataViewMapping,
    validateDataViewRoles,
    IAugmentedMetadataField,
    IDataProcessingPayload,
    IDataViewFlags,
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
import ISelectionId = powerbi.visuals.ISelectionId;

import range from 'lodash/range';
import reduce from 'lodash/reduce';

import {
    dataLoadingComplete,
    recordDataWindowLoad,
    resetLoadingCounters,
    updateDataProcessingStage
} from '../../store/visual';

import { getEmptyDataset, IVisualDataset } from './dataset';
import { IVisualValueMetadata, IVisualValueRow } from './dataset';
import { isFeatureEnabled } from '../utils/features';
import { getState, store } from '../../store';
import {
    createSelectionIds,
    getSidString,
    getDataPointStatus
} from '../interactivity/selection';
import { resolveVisualMetaToDatasetField } from '../template';
import { hostServices } from '../services';

/**
 * Convenience constant that confirms whether the `fetchMoreData` feature switch is enabled via features.
 */
const isFetchMoreEnabled = isFeatureEnabled('fetchMoreData');

/**
 * Determines whether the visual can fetch more data, based on the feature switch and the corresponding flag in the Redux store
 * (set by data processing methods).
 */
const canFetchMore = () => isFetchMoreEnabled && getState().visual.canFetchMore;

/**
 * Retrieve all `powerbi.DataViewCategoryColumn[]` entries from the visual's data view, which are available from Deneb's Redux store.
 */
const getCategoryColumns = () => getState()?.visual?.categories || [];

/**
 * Processes the data in the visual's data view into an object suitable for the visual's API.
 */
const getMappedDataset = (categorical: DataViewCategorical): IVisualDataset => {
    const categories = categorical?.categories,
        values = categorical?.values,
        columns = getConsolidatedFields(categories, values),
        fieldValues = getConsolidatedValues(categories, values),
        rowCount = getRowCount(categorical),
        empty = getEmptyDataset(),
        selections: ISelectionId[] = <ISelectionId[]>(
            hostServices.selectionManager.getSelectionIds()
        );
    if (rowCount === 0) {
        return empty;
    } else {
        try {
            const metadata = getConsolidatedMetadata(columns),
                dataValues: IVisualValueRow[] = range(rowCount).map((r, ri) => {
                    const md = getDataRow(columns, fieldValues, ri),
                        identity = createSelectionIds(metadata, categories, [
                            r
                        ])[0];
                    return {
                        ...{
                            __identity__: identity,
                            __key__: getSidString(identity),
                            identityIndex: r,
                            __selected__: getDataPointStatus(
                                identity,
                                selections
                            )
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

/**
 * For the supplied `powerbi.VisualUpdateOptions`, interrogate the data view and visual settings to ensure that data is loaded. This could be
 * capped to the window default, or via windowing if elibigle to do so.
 */
const handleDataFetch = (options: VisualUpdateOptions) => {
    if (isFetchMoreEnabled) {
        handleDataLoad(options);
    } else {
        dispatchLoadingComplete();
    }
};

/**
 * Validates the data view, to confirm that we can get past the splash screen.
 */
const validateDataViewMapping = (dataViews?: DataView[]) =>
    (dataViews?.length > 0 &&
        dataViews[0]?.categorical &&
        dataViews[0]?.metadata?.columns &&
        true) ||
    false;

/**
 * Validates supplied data roles, to allow us to proceed with normal workflow.
 */
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

/**
 * Stages to within the store when processing data, and therefore give us some UI hooks for the end-user.
 */
type TDataProcessingStage = 'Initial' | 'Fetching' | 'Processing' | 'Processed';

/**
 * For a Power BI primitive, apply any data type-specific logic before returning a value that can work with the visual dataset.
 */
const castPrimitiveValue = (
    field: IAugmentedMetadataField,
    value: powerbi.PrimitiveValue
) => (field?.column.type.dateTime ? new Date(value?.toString()) : value);

/**
 * Ensure that the Redux store counters are reset, ready for a new data load.
 */
const dispatchResetLoadingCounters = () => {
    store.dispatch(resetLoadingCounters(true));
};

/**
 * Ensures that the Redux store state is correct for a loaded dataset.
 */
const dispatchLoadingComplete = () => {
    store.dispatch(dataLoadingComplete());
};

/**
 * Updates the Redux store for each window of the dataset loaded from the visual host.
 */
const dispatchWindowLoad = (rowsLoaded: number) => {
    store.dispatch(recordDataWindowLoad(rowsLoaded));
};

/**
 * If a Power BI column or measure contains characters that create problems in JSON or Vega/Vega-Lite expressions and encodings,
 * we will replace them with an underscore, which is much easier to educate people on than having to learn all the specifics of
 * escaping in the right context, in the right way.
 *
 *  - Vega: https://vega.github.io/vega/docs/types/#Field
 *  - Vega-Lite: https://vega.github.io/vega-lite/docs/field.html
 */
const encodeFieldForSpec = (displayName: string) =>
    displayName?.replace(/([\\".\[\]])/g, '_') || '';

/**
 * For supplied data view metadata (columns & measures), enumerate them and produce a unified list of all fields for the dataset.
 */
const getConsolidatedFields = (
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

/**
 * For all dataset fields, get a consolidated array of all entries, plus additional metadata to assist with template and selection
 * ID generation when the data view is mapped.
 */
const getConsolidatedMetadata = (fields: IAugmentedMetadataField[]) => {
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

/**
 * For supplied data view metadata (columns & measures), enumerate them and produce a unified list of all values for the dataset.
 */
const getConsolidatedValues = (
    categories: DataViewCategoryColumn[],
    values: DataViewValueColumns
) => [
    ...(categories?.map((c) => c.values) || []),
    ...(values?.map((v) => v.values) || [])
];

/**
 * Checks the supplied columns for the correct index of the content column, so that we can map it correctly later.
 */
const getDataRoleIndex = (fields: DataViewMetadataColumn[], role: string) =>
    fields?.findIndex((f) => f.roles[`${role}`]) || -1;

/**
 * For supplied data view consolidated metadata (all columns + measures), produce a suitable object representation of the row
 * that corresponds with the dataset metadata.
 */
const getDataRow = (
    fields: IAugmentedMetadataField[],
    values: powerbi.PrimitiveValue[][],
    index: number
) =>
    reduce(
        fields,
        (accumulator, f, fi) => {
            const rawValue = values[fi][index];
            if (f?.column.roles?.dataset) {
                accumulator[encodeFieldForSpec(f.column.displayName)] =
                    castPrimitiveValue(f, rawValue);
            }
            return accumulator;
        },
        <IVisualValueRow>{}
    );

/**
 * Checks for valid `categorical` dataview and provides count of values.
 */
const getRowCount = (categorical: DataViewCategorical) =>
    categorical?.categories?.[0]?.values?.length ||
    categorical?.values?.[0]?.values?.length ||
    0;

/**
 * Determine whether additional data can/should be loaded from the visual host, and manage this operation along with the Redux
 * store state.
 */
const handleAdditionalWindows = (segment: DataViewSegmentMetadata) => {
    (shouldFetchMore(segment) &&
        store.dispatch(
            updateDataProcessingStage({
                dataProcessingStage: 'Fetching',
                canFetchMore: hostServices.fetchMoreData(true)
            })
        )) ||
        dispatchLoadingComplete();
};

/**
 * Ensure that the Redux store loading counters are updated for the correct event in the visual workflow.
 */
const handleCounterReset = (operationKind: VisualDataChangeOperationKind) => {
    operationKind === VisualDataChangeOperationKind.Create &&
        dispatchResetLoadingCounters();
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
 * Based on the supplied segment from the data view, plus Redux store state and settings, determine if the visual host should be
 * instructed to request more data.
 */
const shouldFetchMore = (segment: DataViewSegmentMetadata): boolean =>
    segment &&
    getState().visual.settings.dataLimit.override &&
    getState().visual.canFetchMore;
