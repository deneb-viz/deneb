import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

import forEach from 'lodash/forEach';
import keys from 'lodash/keys';
import matches from 'lodash/matches';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import reduce from 'lodash/reduce';

import { IVisualDatasetField, IVisualDatasetFields } from '../../core/data';
import { IVegaViewDatum } from '../../core/vega';
import { getState } from '../../store';
import { getDataset } from '../../core/data/dataset';
import { getCategoryColumns } from '../../core/data/dataView';
import {
    ROW_IDENTITY_FIELD_NAME,
    ROW_INDEX_FIELD_NAME
} from '@deneb-viz/dataset/field';
import { type DatasetValueRow } from '@deneb-viz/dataset/datum';
import { getVisualSelectionIdBuilder } from '@deneb-viz/powerbi-compat/visual-host';

/**
 * Confirm that each datum in a datset contains a reconcilable identifier for
 * selection purposes.
 */
const allDataHasIdentities = (data: IVegaViewDatum[]) =>
    data?.filter((d) =>
        Object.prototype.hasOwnProperty.call(d, ROW_INDEX_FIELD_NAME)
    )?.length === data?.length;

/**
 * For the supplied (subset of) `fields`, Power BI data view `categories`
 * and `rowIndices`, attempt to generate an array of valid
 *  `powerbi.visuals.ISelectionId`.
 */
export const createSelectionIds = (
    fields: IVisualDatasetFields,
    categories: DataViewCategoryColumn[],
    rowIndices: number[]
) => {
    const identities: ISelectionId[] = [];
    forEach(rowIndices, (ri) => {
        const identity = getVisualSelectionIdBuilder();
        forEach(fields, (v) => {
            switch (true) {
                case v?.isMeasure: {
                    identity.withMeasure(v.queryName);
                    break;
                }
                default: {
                    identity.withCategory(categories[v.sourceIndex], ri);
                }
            }
        });
        identities.push(identity.createSelectionId());
    });
    return identities;
};

/**
 * Get a reduced set of fields based on an array of key names from Deneb's
 * store.
 */
export const getDatasetFieldsBySelectionKeys = (keys: string[] = []) =>
    pick(getDataset().fields, keys);

/**
 * For a resolved `data` object from a Vega tooltip handler, attempt to identify
 * a valid Power BI selection ID that can be added to the tooltip call for any
 * report pages that Power BI may have for the selector. If there is no explicit
 * identity discoverable in the data, then it will attempt to create a selection
 * ID from the dataset and data view based on known values.
 *
 * Returns single item array containing valid `ISelectionId` (or `null` if a
 * selection ID cannot be resolved).
 */
export const getIdentitiesFromData = (
    data: IVegaViewDatum[]
): ISelectionId[] => {
    const { dataset } = getState();
    switch (true) {
        case !data: {
            // Selection can/should be cleared
            return null;
        }
        case data?.length === 1 &&
            Object.prototype.hasOwnProperty.call(
                data[0],
                ROW_IDENTITY_FIELD_NAME
            ): {
            // Single, identifiable datum
            return [<ISelectionId>data[0]?.[ROW_IDENTITY_FIELD_NAME]];
        }
        case data?.length > 1 && allDataHasIdentities(data): {
            // Multiple data, and all can resolve to selectors
            return getSelectorsFromData(data);
        }
        default: {
            const metadata = getDatasetFieldsBySelectionKeys(
                keys(data?.[0] || [])
            );
            const values = getValuesForField(metadata, data);
            if (values?.length === dataset.values.length) {
                // All rows selected, ergo we don't actually need to highlight; as per `!data` case above
                return null;
            }
            // Fall-through; return all selection IDs, or the ones we try to resolve.
            return (
                (values && getSelectorsFromData(values)) ||
                createSelectionIds(metadata, getCategoryColumns(), null)
            );
        }
    }
};

/**
 * Get array of all data row indices for a supplied dataset.
 */
const getIdentityIndices = (data: IVegaViewDatum[]): number[] =>
    data?.map((d) => d?.[ROW_INDEX_FIELD_NAME]);

/**
 * For the supplied (subset of) `fields` and `data`, attempt to find any
 * matching rows in the visual's processed dataset for this combination.
 */
const getMatchedValues = (
    fields: IVisualDatasetFields,
    data: IVegaViewDatum[]
): DatasetValueRow[] => {
    const resolvedMd = resolveDatumForFields(fields, data?.[0]);
    const matchedRows = getValues().filter(matches(resolvedMd));
    if (matchedRows.length > 0) {
        return matchedRows;
    }
    return (matchedRows.length > 0 && matchedRows) || null;
};

/**
 * For the supplied data, extract all `SelectionId`s into an array.
 */
export const getSelectorsFromData = (
    data: IVegaViewDatum[] | DatasetValueRow[]
) =>
    getValuesByIndices(getIdentityIndices(data)).map(
        (v) => v?.[ROW_IDENTITY_FIELD_NAME]
    );

/**
 * Get all values (excluding metadata) for current processed dataset from Deneb's store.
 */
const getValues = () => getDataset().values;

/**
 * Returns `getValues()`, but filtered for a supplied list `__row__` values.
 */
const getValuesByIndices = (indices: number[]) =>
    getValues().filter((v) => indices.indexOf(v?.[ROW_INDEX_FIELD_NAME]) > -1);

/**
 * For the supplied (subset of) `field` and `datum`, attempt to find the
 * first matching row in the visual's processed dataset for this combination.
 * Note that if Vega/Vega-Lite applies a prefixed aggregate in the datum, we
 * can't reconcile this wihtout further processing. We could consider processing
 * for agg prefix, e.g. and seeing if we can match like this:
 *   (?:max|min|sum|argMax|argMin[etc...]_){1}(.*), but this may open up a whole
 * other can of worms, like having to match on an aggregated value and doing this
 * ourselves. I'll leave this here as a reminder to think about it.
 */
const getValuesForField = (
    field: IVisualDatasetFields,
    data: IVegaViewDatum[]
): DatasetValueRow[] => {
    const matches = getMatchedValues(field, data);
    if (matches?.length > 0) {
        return matches;
    }
    return getMatchedValues(
        pickBy(field, (md) => !md.isMeasure),
        data
    );
};

/**
 * For the supplied (subset of) `fields` and `datum`, remove any fields from
 * the datum that do not match our desired fields, so we're left with their
 * metadata.
 */
const resolveDatumForFields = (
    fields: IVisualDatasetFields,
    datum: IVegaViewDatum
) => {
    const reducedDatum = <DatasetValueRow>pick(datum, keys(fields)) || null;
    return reduce(
        reducedDatum,
        (result, value, key) => {
            result[key] = resolveValueForField(fields[key], value);
            return result;
        },
        <DatasetValueRow>{}
    );
};

/**
 * Take an item from a Vega event and attempt to resolve data that we can use
 * to attempt to apply interactivity to.
 */
export const resolveDataFromItem = (item: any): IVegaViewDatum[] => {
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
 * Because Vega's tooltip channel supplies datum field values as strings, for a
 * supplied metadata `field` and `datum`, attempt to resolve it to a pure type,
 * so that we can try to use its value to reconcile against the visual's dataset
 * in order to resolve selection IDs.
 */
const resolveValueForField = (field: IVisualDatasetField, value: any) => {
    switch (true) {
        case field.type.dateTime: {
            return new Date(value);
        }
        case field.type.numeric:
        case field.type.integer: {
            return Number.parseFloat(value);
        }
        default:
            return value;
    }
};
