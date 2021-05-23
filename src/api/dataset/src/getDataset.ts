import { getState } from '../../store';

export const getDataset = () => getState().visual?.dataset;
