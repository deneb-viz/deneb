import powerbi from 'powerbi-visuals-api';
import DataView = powerbi.DataView;
import DataViewCategorical = powerbi.DataViewCategorical;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewValueColumns = powerbi.DataViewValueColumns;
import PrimitiveValue = powerbi.PrimitiveValue;
import DataViewMetadata = powerbi.DataViewMetadata;

import { getState } from '../../store';
import { IAugmentedMetadataField } from '.';
import { TDataPointHighlightComparator } from '../../features/interactivity';
import { VisualFormattingSettingsModel } from '@deneb-viz/powerbi-compat/properties';
import { type DataPointSelectionStatus } from '@deneb-viz/powerbi-compat/interactivity';

/**
 * Determines whether the visual can fetch more data, based on the feature switch and the corresponding flag in the store
 * (set by data processing methods).
 */
export const canFetchMoreFromDataview = (
    settings: VisualFormattingSettingsModel,
    metadata: DataViewMetadata
) => {
    return (
        (metadata?.segment && settings.dataLimit.loading.override.value) ||
        false
    );
};

/**
 * For a Power BI primitive, apply any data type-specific logic before returning a value that can work with the visual dataset.
 */
export const castPrimitiveValue = (
    field: IAugmentedMetadataField,
    value: PrimitiveValue
) =>
    field?.column.type.dateTime && value !== null
        ? new Date(value?.toString())
        : value;

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
 * For a field, determine if a highlight has been explicitly applied or not (similar to selection)
 */
export const resolveHighlightStatus = (
    hasHighlights: boolean,
    fieldValue: PrimitiveValue,
    comparatorValue: PrimitiveValue
): DataPointSelectionStatus => {
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
