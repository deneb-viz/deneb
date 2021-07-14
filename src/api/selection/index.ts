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
} from '../dataset';
import { isFeatureEnabled } from '../features';
import { hostServices } from '../../core/services';
import { IVegaViewDatum } from '../../core/vega';

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

const getSelectionIdBuilder = () => hostServices.selectionIdBuilder();

const getSidString = (id: ISelectionId) => JSON.stringify(id.getSelector());

const isContextMenuEnabled = isFeatureEnabled('selectionContextMenu');

const isDataPointEnabled = isFeatureEnabled('selectionDataPoint');

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
