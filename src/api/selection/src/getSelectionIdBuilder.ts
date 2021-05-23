import { getState } from '../../store';

export const getSelectionIdBuilder = () =>
    getState().visual.selectionIdBuilder();
