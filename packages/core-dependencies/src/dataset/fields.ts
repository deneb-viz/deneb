import { IDatasetFields } from '../definitions';
import { pickBy } from '../utils';

/**
 * For supplied fields, retrieve only those that should be from the data roles.
 */
export function getDatasetFieldsInclusive(fields: IDatasetFields) {
    return pickBy(fields, (f) => !f.isExcludedFromTemplate);
}
