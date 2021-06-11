export { getLocale };

import { getState } from '../store';

const getLocale = () => getState().visual.locale;
