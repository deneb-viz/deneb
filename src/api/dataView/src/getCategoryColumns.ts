import { getState } from '../../store';

export const getCategoryColumns = () => getState().visual.categories;
