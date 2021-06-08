import _ from 'lodash';

import {
    ITableColumnMetadata,
    IVisualValueMetadata,
    IVisualValueRow
} from '../../dataset';
import { IVegaViewDatum } from './interfaces';
import { selectionKeywords } from './selectionKeyWords';

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
