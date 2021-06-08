import _ from 'lodash';

import { getDataset } from './getDataset';
import { resolveDatumForMetadata } from '../../selection/src/datum';
import { IVegaViewDatum } from '../../selection/src/interfaces';
import { IVisualValueMetadata, IVisualValueRow } from './interfaces';

export const getValues = () => getDataset().values;

export const getValueForDatum = (
    metadata: IVisualValueMetadata,
    datum: IVegaViewDatum
): IVisualValueRow =>
    _(getValues()).find(_.matches(resolveDatumForMetadata(metadata, datum))) ||
    null;
