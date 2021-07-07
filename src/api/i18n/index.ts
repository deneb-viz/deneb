export { getHostLM, getLocale, TLocale };

import { getState } from '../store';

const getHostLM = () => getState().visual.i18n;

const getLocale = () => getState().visual.locale;

type TLocale = 'en-US' | 'de-DE' | 'fr-FR';
