import { DATASET_FIELD_FORMATED_VALUE_SUFFIX, DATASET_FIELD_FORMAT_STRING_SUFFIX } from '@deneb-viz/core-dependencies';

/**
 * Provides all number formatting field suffixes, suitable for a RegExp expression.
 */
export const getNumberFormatRegExpAlternation = () =>
    `${DATASET_FIELD_FORMAT_STRING_SUFFIX}|${DATASET_FIELD_FORMATED_VALUE_SUFFIX}`;
