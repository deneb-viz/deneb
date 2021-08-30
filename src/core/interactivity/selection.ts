export {
    createSelectionId,
    getSelectionIdBuilder,
    getSidString,
    isContextMenuEnabled,
    isDataPointEnabled,
    resolveDatumValueForMetadataColumn,
    resolveDatumForMetadata
};

import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

import forEach from 'lodash/foreach';
import keys from 'lodash/keys';
import pick from 'lodash/pick';
import reduce from 'lodash/reduce';

import {
    ITableColumnMetadata,
    IVisualValueMetadata,
    IVisualValueRow
} from '../data/dataset';
import { isFeatureEnabled } from '../utils/features';
import { hostServices } from '../services';
import { IVegaViewDatum } from '../vega';

/**
 * For the supplied (subset of) `metadata`, Power BI data view `categories` and `rowIndex`, attempt to generate a valid `powerbi.visuals.ISelectionId`.
 * Will return a `null` selector if one cannot be resolved.
 */
const createSelectionId = (
    metadata: IVisualValueMetadata,
    categories: DataViewCategoryColumn[],
    rowIndex: number
) => {
    const identity = getSelectionIdBuilder();
    forEach(metadata, (v) => {
        switch (true) {
            case v?.isMeasure: {
                identity.withMeasure(v.queryName);
                break;
            }
            default: {
                identity.withCategory(categories[v.sourceIndex], rowIndex);
            }
        }
    });
    return identity.createSelectionId();
};

/**
 * Get a new instance of a `powerbi.visuals.ISelectionIdBuilder` from Deneb's Redux store, so that we can use to to create selection IDs for data points.
 */
const getSelectionIdBuilder = () => hostServices.selectionIdBuilder();

/**
 * We have some compatibility issues between `powerbi.extensibility.ISelectionId` and `powerbi.visuals.ISelectionId`, as well as needing to coerce Selection
 * IDs to strings so that we can set intial selections for Vega-Lite (as objects aren't supported). This consolidates the logic we're using to resolve a
 * Selection ID to a string representation suitable for use across the visual.
 */
const getSidString = (id: ISelectionId) => JSON.stringify(id.getSelector());

/**
 * Convenience constant that confirms whether the `selectionContextMenu` feature switch is enabled via features.
 */
const isContextMenuEnabled = isFeatureEnabled('selectionContextMenu');

/**
 * Convenience constant that confirms whether the `selectionDataPoint` feature switch is enabled via features.
 */
const isDataPointEnabled = isFeatureEnabled('selectionDataPoint');

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
