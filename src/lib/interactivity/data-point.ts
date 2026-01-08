import powerbi from 'powerbi-visuals-api';

import { matchesObjectKeyValues, pickBy } from '@deneb-viz/utils/object';
import { type InteractivityLookupDataset } from './types';
import { logDebug } from '@deneb-viz/utils/logging';
import {
    type DatasetField,
    type DatasetFields,
    ROW_INDEX_FIELD_NAME
} from '@deneb-viz/data-core/field';
import { type VegaDatum } from '@deneb-viz/data-core/value';
import { type AugmentedMetadataField } from '../dataset';

/**
 * Confirm that each datum in a dataset contains a reconcilable identifier for selection purposes.
 */
const allValuesHaveIdentityField = (data: VegaDatum[]) =>
    data?.filter((d) =>
        Object.prototype.hasOwnProperty.call(d, ROW_INDEX_FIELD_NAME)
    )?.length === data?.length;

/**
 * Get a reduced set of fields based on an array of key names from the dataset fields.
 */
export const getDatasetFieldsBySelectionKeys = (
    fields: DatasetFields<AugmentedMetadataField>,
    keys: string[] = []
) => pickBy(fields, (_v, k) => keys.indexOf(`${k}`) !== -1);

/**
 * For supplied event data from a vega view, and our base dataset, attempt to resolve valid row number identities that
 * can be then used to resolve against the selection manager.
 */
export const getResolvedRowIdentities = (
    data: VegaDatum[],
    dataset: InteractivityLookupDataset
): number[] => {
    const LOG_PREFIX = '[getResolvedRowIdentities]';
    // No datum to process; therefore no identities.
    if (!data || data.length === 0) {
        //logDebug(`${LOG_PREFIX} no data supplied, returning empty array`);
        return [];
    }
    // Single, identifiable datum
    if (data.length === 1 && data[0]?.[ROW_INDEX_FIELD_NAME] !== undefined) {
        // logDebug(`${LOG_PREFIX} single datum with identity field found`, {
        //     datum: data[0]
        // });
        return [data[0][ROW_INDEX_FIELD_NAME]];
    }
    // Multiple values; all with identifiable row indices
    if (allValuesHaveIdentityField(data)) {
        // logDebug(`${LOG_PREFIX} all datum have identity field`, { data });
        return getRowNumbersFromData(data);
    }
    // Otherwise, panic mode: try to identify from the matched values
    // logDebug(`${LOG_PREFIX} attempting to resolve via field matching`, {
    //     data,
    //     dataset
    // });
    const metadata = getDatasetFieldsBySelectionKeys(
        dataset?.fields || {},
        Object.keys(data?.[0] || {})
    ) as DatasetFields<AugmentedMetadataField>;
    const foundValues = getValuesForField(data, {
        fields: metadata,
        values: dataset.values
    });
    logDebug(`${LOG_PREFIX} resolved values`, {
        values: foundValues
    });
    // All rows selected, ergo we don't actually need to highlight; as per `!data` case above
    if (foundValues?.length === dataset.values.length) {
        logDebug(
            `${LOG_PREFIX} all rows selected; returning empty, so we can clear`
        );
        return [];
    }
    logDebug(`${LOG_PREFIX} fall-through case`, { foundValues });
    return foundValues ? getRowNumbersFromData(foundValues) : [];
};

/**
 * For the supplied (subset of) `fields` and `data`, attempt to find any matching rows in the visual's processed
 * dataset for this combination.
 */
const getMatchedValues = (
    data: VegaDatum[],
    options: InteractivityLookupDataset
): VegaDatum[] => {
    const { fields, values } = options;
    const resolvedMd = resolveDatumForFields(fields, data?.[0] ?? {});
    const matchedRows = values.filter(matchesObjectKeyValues(resolvedMd));
    if (matchedRows.length > 0) {
        return matchedRows;
    }
    return (matchedRows.length > 0 && matchedRows) || [];
};

/**
 * From an array of Vega datum, extract unique row numbers, provided that they exist.
 */
export const getRowNumbersFromData = (data: VegaDatum[]) => {
    const resolvedIndices: number[] = [];
    data.forEach((d) => {
        const rowIndex = d[ROW_INDEX_FIELD_NAME];
        if (
            rowIndex !== undefined &&
            resolvedIndices.indexOf(rowIndex as number) === -1
        ) {
            resolvedIndices.push(rowIndex as number);
        }
    });
    return resolvedIndices;
};

/**
 * For the supplied (subset of) `field` and `datum`, attempt to find the first matching row in the visual's processed
 * dataset for this combination.
 *
 * Note that if Vega/Vega-Lite applies a prefixed aggregate in the datum, we can't reconcile this without further
 * processing. We could consider processing for agg prefix, e.g. and seeing if we can match like this:
 *   `(?:max|min|sum|argMax|argMin[etc...]_){1}(.*)`
 * ...but this may open up a whole other can of worms, like having to match on an aggregated value and doing this
 * ourselves. I'll leave this here as a reminder to think about it.
 */
const getValuesForField = (
    data: VegaDatum[],
    options: InteractivityLookupDataset
): VegaDatum[] => {
    const matches = getMatchedValues(data, options);
    if (matches?.length > 0) {
        return matches;
    }
    return getMatchedValues(data, {
        fields: pickBy(
            options.fields,
            (md) => !md.hostMetadata?.column.isMeasure
        ) as DatasetFields<AugmentedMetadataField>,
        values: options.values
    });
};

/**
 * For the supplied (subset of) `fields` and `datum`, remove any fields from
 * the datum that do not match our desired fields, so we're left with their
 * metadata.
 */
const resolveDatumForFields = (
    fields: DatasetFields<AugmentedMetadataField>,
    datum: VegaDatum
): VegaDatum => {
    const fieldKeys = Object.keys(fields);
    const reducedDatum: VegaDatum = {};
    for (const key of fieldKeys) {
        if (key in datum) {
            reducedDatum[key] = datum[key];
        }
    }
    const result: VegaDatum = {};
    for (const [key, value] of Object.entries(reducedDatum)) {
        if (fields[key]) {
            result[key] = resolveValueForField(fields[key], value);
        }
    }
    return result;
};

/**
 * Take an item from a Vega event and attempt to resolve its datum, accounting for Vega-Lite specific scenarios like
 * faceting.
 */
export const resolveDatumFromItem = (item: any): VegaDatum[] => {
    switch (true) {
        case item === undefined:
            return [];
        case item?.context?.data?.facet?.values?.value:
            return item?.context?.data?.facet?.values?.value?.slice();
        default:
            return [{ ...item?.datum }];
    }
};

/**
 * Because Vega's tooltip channel supplies datum field values as strings, for a supplied metadata `field` and `value`,
 * attempt to resolve it to a pure type, so that we can try to use its value to reconcile against the visual's dataset
 * in order to resolve row identifiers.
 */
const resolveValueForField = (
    field: DatasetField<AugmentedMetadataField>,
    value: any
) => {
    switch (true) {
        case field?.hostMetadata?.column?.type?.dateTime: {
            return new Date(value);
        }
        case field?.hostMetadata?.column?.type?.numeric:
        case field?.hostMetadata?.column?.type?.integer: {
            return Number.parseFloat(value);
        }
        default:
            return value;
    }
};
