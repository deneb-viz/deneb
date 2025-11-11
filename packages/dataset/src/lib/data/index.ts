import { type IDatasetFields } from '../field';
import { pickBy } from '@deneb-viz/utils/object';

/**
 * For supplied fields, retrieve only those that should be from the data roles.
 */
export function getDatasetFieldsInclusive(fields: IDatasetFields) {
    return pickBy(fields, (f) => !f.isExcludedFromTemplate);
}
