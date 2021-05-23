import powerbi from 'powerbi-visuals-api';
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import _ from 'lodash';

import { getSelectionIdBuilder } from './getSelectionIdBuilder';
import { IVisualValueMetadata } from '../../../types';

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
                identity.withCategory(
                    categories[v.sourceIndex],
                    rowIndex
                );
            }
        }
    });
    return identity.createSelectionId();
};
