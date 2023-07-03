import {
    DATASET_FIELD_FORMATED_VALUE_SUFFIX,
    DATASET_DYNAMIC_FORMAT_STRING_SUFFIX
} from '../../constants/dataset';

/**
 * Provides all formatting field suffixes, suitable for a RegExp expression.
 */
export const getFormatFieldRegExpAlternation = () =>
    `${DATASET_FIELD_FORMATED_VALUE_SUFFIX}|${DATASET_DYNAMIC_FORMAT_STRING_SUFFIX}`;
