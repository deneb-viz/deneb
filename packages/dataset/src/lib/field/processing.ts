import { pickBy } from '@deneb-viz/utils/object';
import { type IDatasetFields } from './types';
import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';

/**
 * For supplied fields, retrieve only those that should be from the data roles.
 */
export function getDatasetFieldsInclusive(fields: IDatasetFields) {
    return pickBy(fields, (f) => !f.isExcludedFromTemplate);
}

/**
 * Get the eligible template fields from a supplied set of metadata.
 */
export const getDatasetTemplateFieldsFromMetadata = (
    metadata: IDatasetFields
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
