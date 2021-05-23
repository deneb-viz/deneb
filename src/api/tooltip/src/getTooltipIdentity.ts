import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.extensibility.ISelectionId;
import _ from 'lodash';

import { getValueForDatum } from '../../dataset/src/values';
import { getMetadataByKeys } from '../../dataset/src/metadata';
import { getCategoryColumns } from '../../dataView/src/getCategoryColumns';
import { IVegaViewDatum } from '../../selection/src/interfaces';
import { createSelectionId } from '../../selection/src/createSelectionId';

export const getTooltipIdentity = (datum: IVegaViewDatum): [ISelectionId] => {
    const datumId = datum?.__identity__;
    if (datumId) return [<ISelectionId>datumId];
    // Try and create a selection ID from fields/values that can be resolved from datum
    const metadata = getMetadataByKeys(_.keys(datum)),
        value = getValueForDatum(metadata, datum),
        categories = getCategoryColumns(),
        selectionId = value && createSelectionId(metadata, categories, value.identityIndex);

    return selectionId ? [selectionId] : null;
};
