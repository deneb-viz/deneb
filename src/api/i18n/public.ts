import { getState } from '../store/public';

export const getHostLM = () => getState().visual.i18n;

export const getLocale = () => getState().visual.locale;

export type TLocale = 'en-US' | 'de-DE' | 'fr-FR';
