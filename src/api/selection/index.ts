export {
    createSelectionId,
    getSelectionIdBuilder,
    isContextMenuEnabled,
    isDataPointEnabled,
    resolveDatumForKeywords,
    resolveDatumValueForMetadataColumn,
    resolveDatumForMetadata,
    selectionKeywords,
    IVegaViewDatum
};

import powerbi from 'powerbi-visuals-api';
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import _ from 'lodash';

import {
    ITableColumnMetadata,
    IVisualValueMetadata,
    IVisualValueRow
} from '../dataset';
import { isFeatureEnabled } from '../features';
import { getState } from '../store';

const createSelectionId = (
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

const getSelectionIdBuilder = () => getState().visual.selectionIdBuilder();

const isContextMenuEnabled = isFeatureEnabled('selectionContextMenu');

const isDataPointEnabled = isFeatureEnabled('selectionDataPoint');

const resolveDatumForKeywords = (obj: IVegaViewDatum) =>
    Object.entries({ ...obj }).filter(
        ([k, v]) => selectionKeywords.indexOf(k) === -1
    );

const resolveDatumForMetadata = (
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

const selectionKeywords = ['__identity__', '__key__'];

interface IVegaViewDatum {
    [key: string]: any;
}
