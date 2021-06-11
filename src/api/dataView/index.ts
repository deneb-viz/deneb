export { encodeFieldForSpec, getCategoryColumns, isFetchMoreEnabled };

import { isFeatureEnabled } from '../features';
import { getState } from '../store';

const encodeFieldForSpec = (displayName: string) =>
    displayName.replace(/([\\".\[\]])/g, '_');

const getCategoryColumns = () => getState().visual.categories;

const isFetchMoreEnabled = isFeatureEnabled('fetchMoreData');
