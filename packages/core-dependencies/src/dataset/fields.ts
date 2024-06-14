import { IDatasetFields } from '../definitions';
import { pickBy } from '../utils';

/**
 * For supplied fields, retrieve only those that should be from the data roles.
 */
export function getDatasetFieldsInclusive(fields: IDatasetFields) {
    return pickBy(fields, (f) => !f.isExcludedFromTemplate);
}

/**
 * When performing placeholder replacements, we need to ensure that special characters used in regex qualifiers are
 * suitably escaped so that we don't inadvertently mangle them. Returns escaped string, suitable for pattern matching
 * if any special characters are used.
 */
export function getEscapedReplacerPattern(value: string) {
    return value.replace(/[-/\\^$*+?.()&|[\]{}]/g, '\\$&');
}
