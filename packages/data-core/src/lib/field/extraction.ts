import { pickBy } from '@deneb-viz/utils/object';
import { toUsermetaDatasetField } from './template-metadata';
import type { DatasetFields, UsermetaDatasetField } from './types';

/**
 * For supplied fields, retrieve only those that should be eligible for template operations.
 * Fields are eligible unless explicitly marked as support fields via `isSupportField: true`.
 */
export function getDatasetFieldsInclusive(fields: DatasetFields | undefined) {
    if (!fields) {
        return {};
    }
    return pickBy(fields, (f) => f?.isSupportField !== true);
}

/**
 * Get the eligible template fields from a supplied set of metadata.
 * Transforms DatasetFields to UsermetaDatasetFields with sequential placeholders.
 */
export const getDatasetTemplateFieldsFromMetadata = (
    metadata: DatasetFields | undefined
): UsermetaDatasetField[] =>
    Object.entries(getDatasetFieldsInclusive(metadata))
        .filter(
            (entry): entry is [string, NonNullable<DatasetFields[string]>] =>
                entry[1] !== undefined
        )
        .map(([key, field], i) =>
            toUsermetaDatasetField(key, field, { placeholder: `__${i}__` })
        );
