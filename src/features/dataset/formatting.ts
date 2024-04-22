import powerbi from 'powerbi-visuals-api';
import DataViewValueColumn = powerbi.DataViewValueColumn;

/**
 * Test if a data view field is numeric or date/time valued. if so, then we
 * should provide formatting support fields for it.
 */
export const isDataViewFieldEligibleForFormatting = (
    field: DataViewValueColumn
) => field.source.type.numeric || field.source.type.dateTime;
