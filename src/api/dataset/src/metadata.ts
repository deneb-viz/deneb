import _ from 'lodash';
import { getDataset } from './getDataset';

export const getMetadata = () => getDataset().metadata;

export const getMetadataByKeys = (keys: string[] = []) =>
    _.pick(getMetadata(), keys);
