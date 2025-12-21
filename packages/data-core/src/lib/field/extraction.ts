import { pickBy } from 'lodash';
import type { DatasetFields, UsermetaDatasetField } from './types';

/**
 * For supplied fields, retrieve only those that should be from the data roles.
 */
export function getDatasetFieldsInclusive(fields: DatasetFields | undefined) {
    if (!fields) {
        return {};
    }
    return pickBy(fields, (f) => !f.isExcludedFromTemplate);
}

/**
 * Get the eligible template fields from a supplied set of metadata.
 */
export const getDatasetTemplateFieldsFromMetadata = (
    metadata: DatasetFields | undefined
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
