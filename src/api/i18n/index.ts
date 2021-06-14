export { getHostLM, getLocale };

import { getState } from '../store';

const getHostLM = () => getState().visual.i18n;

const getLocale = () => getState().visual.locale;
