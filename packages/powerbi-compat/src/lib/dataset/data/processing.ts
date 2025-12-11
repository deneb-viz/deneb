import { getHashValue } from '@deneb-viz/utils/crypto';
import { type IDataset } from './types';

/**
 * Ensures an empty dataset is made available.
 */
export const getEmptyDataset = (): IDataset => ({
    fields: {},
    hashValue: getHashValue({}),
    values: [],
    hasDrilldown: false,
    hasHighlights: false,
    rowsLoaded: 0
});
