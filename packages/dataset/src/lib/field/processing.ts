import { pickBy } from '@deneb-viz/utils/object';
import { type AugmentedMetadataField, type IDatasetFields } from './types';
import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';

/**
 * For a Power BI primitive, apply any data type-specific logic before returning a value that can work with the visual dataset.
 */
export const getCastedPrimitiveValue = (
    field: AugmentedMetadataField,
    value: powerbi.PrimitiveValue
) =>
    field?.column?.type?.dateTime && value !== null
        ? new Date(value?.toString())
        : value;

/**
 * For supplied fields, retrieve only those that should be from the data roles.
 */
export function getDatasetFieldsInclusive(fields: IDatasetFields | undefined) {
    if (!fields) {
        return {};
    }
    return pickBy(fields, (f) => !f.isExcludedFromTemplate);
}

/**
 * Get the eligible template fields from a supplied set of metadata.
 */
export const getDatasetTemplateFieldsFromMetadata = (
    metadata: IDatasetFields | undefined
): UsermetaDatasetField[] =>
    Object.values(getDatasetFieldsInclusive(metadata)).reduce(
        (result, value) => {
            if (value?.templateMetadata) {
                result = result.concat(value.templateMetadata);
            }
            return result;
        },
        [] as UsermetaDatasetField[]
    );

/**
 * Test if a data view field is numeric or date/time valued. if so, then we
 * should provide formatting support fields for it.
 */
export const isFieldEligibleForFormatting = (
    field: powerbi.DataViewValueColumn
) => field?.source?.type?.numeric || field?.source?.type?.dateTime || false;
