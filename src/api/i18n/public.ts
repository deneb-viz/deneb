import { getState } from '../store/public';

export const getHostLM = () => getState().visual.i18n;

export const getLocale = () => getState().visual.locale;
