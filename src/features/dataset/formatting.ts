import powerbi from 'powerbi-visuals-api';
import DataViewValueColumn = powerbi.DataViewValueColumn;

import {
    DATASET_FIELD_FORMATED_VALUE_SUFFIX,
    DATASET_FIELD_FORMAT_STRING_SUFFIX
} from '@deneb-viz/core-dependencies';

/**
 * Provides all formatting field suffixes, suitable for a RegExp expression.
 */
export const getFormatFieldRegExpAlternation = () =>
    `${DATASET_FIELD_FORMAT_STRING_SUFFIX}|${DATASET_FIELD_FORMATED_VALUE_SUFFIX}`;

/**
 * Test if a data view field is numeric or date/time valued. if so, then we
 * should provide formatting support fields for it.
 */
export const isDataViewFieldEligibleForFormatting = (
    field: DataViewValueColumn
) => field.source.type.numeric || field.source.type.dateTime;
