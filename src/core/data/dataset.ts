export {
    allDataHaveIdentitites,
    getDataset,
    getEmptyDataset,
    getIdentityIndices,
    getMetadata,
    getMetadataByKeys,
    getValues,
    getValuesByIndices,
    getValuesForDatum,
    resolveDataFromItem,
    resolveDatumToArray,
    IVisualDataset,
    ITableColumnMetadata,
    IVisualValueMetadata,
    IVisualValueRow
};

import powerbi from 'powerbi-visuals-api';
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import ISelectionId = powerbi.visuals.ISelectionId;

import keys from 'lodash/keys';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import matches from 'lodash/matches';
import reduce from 'lodash/reduce';

import { ITemplateDatasetField } from '../template/schema';

import { getState } from '../../store';
import { IVegaViewDatum } from '../vega';
import {
    isInteractivityReservedWord,
    TDataPointStatus
} from '../interactivity';

/**
 * Confirm that each dataum in a datset contains a reconcilable identifier for selection purposes.
 */
const allDataHaveIdentitites = (data: IVegaViewDatum[]) =>
    data?.filter((d) => d?.hasOwnProperty('identityIndex'))?.length ===
    data?.length;

/**
 * Get current processed dataset (metadata and values) from Deneb's Redux store.
 */
const getDataset = () => getState().visual?.dataset;

/**
 * Ensures an empty dataset is made available.
 */
const getEmptyDataset = (): IVisualDataset => ({
    metadata: {},
    values: []
});

/**
 * Get array of all data row indices for a supplied dataset.
 */
const getIdentityIndices = (data: IVegaViewDatum[]): number[] =>
    data?.map((d) => d?.identityIndex);

/**
 * Get all metadata for current processed dataset from Deneb's Redux store.
 */
const getMetadata = () => getDataset().metadata;

/**
 * Get a reduced set of metadata based on an array of key names from Deneb's Redux store.
 */
const getMetadataByKeys = (keys: string[] = []) => pick(getMetadata(), keys);

/**
 * Get all values (excluding metadata) for current processed dataset from Deneb's Redux store.
 */
const getValues = () => getDataset().values;

/**
 * Returns `getValues()`, but filtered for a supplied list `identityIndex` values.
 */
const getValuesByIndices = (indices: number[]) =>
    getValues().filter((v) => indices.indexOf(v.identityIndex) > -1);

/**
 * For the supplied (subset of) `metadata` and `datum`, attempt to find the first matching row in the visual's processed dataset for this combination.
 * Note that if Vega/Vega-Lite applies a prefixed aggregate in the datum, we can't reconcile this wihtout further processing. We could consider
 * processing for agg prefix, e.g. and seeing if we can match like this: (?:max|min|sum|argMax|argMin[etc...]_){1}(.*), but this may open up a whole
 * other can of worms, like having to match on an aggregated value and doing this ourselves. I'll leave this here as a reminder to think about it.
 */
const getValuesForDatum = (
    metadata: IVisualValueMetadata,
    data: IVegaViewDatum[]
): IVisualValueRow[] => {
    const matches = getMatchedValues(metadata, data);
    if (matches?.length > 0) {
        return matches;
    }
    return getMatchedValues(
        pickBy(metadata, (md) => !md.isMeasure),
        data
    );
};

/**
 * For the supplied (subset of) `metadata` and `data`, attempt to find any matching rows in the visual's processed dataset for this combination.
 */
const getMatchedValues = (
    metadata: IVisualValueMetadata,
    data: IVegaViewDatum[]
): IVisualValueRow[] => {
    const resolvedMd = resolveDatumForMetadata(metadata, data?.[0]),
        matchedRows = getValues().filter(matches(resolvedMd));
    if (matchedRows.length > 0) {
        return matchedRows;
    }
    return (matchedRows.length > 0 && matchedRows) || null;
};

/**
 * For a given (subset of) `metadata` and `datum`, create an `IVisualValueRow` that can be used to search for matching values in the visual's dataset.
 */
const resolveDatumForMetadata = (
    metadata: IVisualValueMetadata,
    datum: IVegaViewDatum
) => {
    const reducedDatum = <IVisualValueRow>pick(datum, keys(metadata)) || null;
    return reduce(
        reducedDatum,
        (result, value, key) => {
            result[key] = resolveDatumValueForMetadataColumn(
                metadata[key],
                value
            );
            return result;
        },
        <IVisualValueRow>{}
    );
};

/**
 * Because Vega's tooltip channel supplies datum field values as strings, for a supplied metadata `column` and `datum`, attempt to resolve it to a pure type,
 * so that we can try to use its value to reconcile against the visual's dataset in order to resolve selection IDs.
 */
const resolveDatumValueForMetadataColumn = (
    column: ITableColumnMetadata,
    value: any
) => {
    switch (true) {
        case column.type.dateTime: {
            return new Date(value);
        }
        case column.type.numeric:
        case column.type.integer: {
            return Number.parseFloat(value);
        }
        default:
            return value;
    }
};

/**
 * For a given datum, resolve it to an array of keys and values. Addiitonally, we can (optionally) ensure that the
 * `interactivityReservedWords` are stripped out so that we can get actual fields and values assigned to a datum.
 */
const resolveDatumToArray = (obj: IVegaViewDatum, filterReserved = true) =>
    Object.entries({ ...obj }).filter(
        ([k, v]) => (filterReserved && !isInteractivityReservedWord(k)) || k
    );

/**
 * Take an item from a Vega event and attempt to resolve .
 */
const resolveDataFromItem = (item: any): IVegaViewDatum[] => {
    switch (true) {
        case item === undefined:
            return null;
        case item?.context?.data?.facet?.values?.value:
            return item?.context?.data?.facet?.values?.value?.slice();
        default:
            return [{ ...item?.datum }];
    }
};

/**
 * Processed visual data and column metadata for rendering.
 */
interface IVisualDataset {
    // All column information that we need to know about (including generated raw values)
    metadata: IVisualValueMetadata;
    // Raw data values for each column
    values: IVisualValueRow[];
}

/**
 * The structure of our visual dataset column metadata.
 */
interface IVisualValueMetadata {
    // Column name & metadata
    [key: string]: ITableColumnMetadata;
}

/**
 * Custom data role metadata, needed to manage functionality within the editors.
 */
interface ITableColumnMetadata extends DataViewMetadataColumn {
    // Flag to confirm if this is a column, according to the data model
    isColumn: boolean;
    // Original dataView index (from categories or values)
    sourceIndex: number;
    // Template export object (which allows customisation from base, while preserving)
    templateMetadata: ITemplateDatasetField;
}

/**
 * Represents each values entry from the data view.
 */
interface IVisualValueRow {
    // Allow key/value pairs for any objects added to the content data role
    [key: string]: any;
    // Identity index (from dataView; for dynamic selectors)
    identityIndex: number;
    // Selection status (for selection manager)
    __status__: TDataPointStatus;
    // Selection ID for row
    __identity__: ISelectionId;
    // String representation of Selection ID
    __key__: string;
}
