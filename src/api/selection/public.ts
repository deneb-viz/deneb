import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

import _ from 'lodash';

import {
    ITableColumnMetadata,
    IVisualValueMetadata,
    IVisualValueRow
} from '../dataset/public';
import { isFeatureEnabled } from '../features/public';
import { getState } from '../store/public';

export const createSelectionId = (
    metadata: IVisualValueMetadata,
    categories: DataViewCategoryColumn[],
    rowIndex: number
) => {
    const identity = getSelectionIdBuilder();
    _(metadata).forEach((v) => {
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

export const getSelectionIdBuilder = () =>
    getState().visual.selectionIdBuilder();

export const getSidString = (id: ISelectionId) =>
    JSON.stringify(id.getSelector());

export const isContextMenuEnabled = isFeatureEnabled('selectionContextMenu');

export const isDataPointEnabled = isFeatureEnabled('selectionDataPoint');

export const resolveDatumForKeywords = (obj: IVegaViewDatum) =>
    Object.entries({ ...obj }).filter(
        ([k, v]) => selectionKeywords.indexOf(k) === -1
    );

export const resolveDatumForMetadata = (
    metadata: IVisualValueMetadata,
    datum: IVegaViewDatum
) => {
    const reducedDatum =
        <IVisualValueRow>_.pick(datum, _.keys(metadata)) || null;
    return _(reducedDatum).reduce((result, value, key) => {
        result[key] = resolveDatumValueForMetadataColumn(metadata[key], value);
        return result;
    }, <IVisualValueRow>{});
};

export const resolveDatumValueForMetadataColumn = (
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

export const selectionKeywords = ['__identity__', '__key__'];

export interface IVegaViewDatum {
    [key: string]: any;
}
