import { type Translations } from '@deneb-viz/app-core';
import { SETTINGS_PANE_TRANSLATIONS } from '@deneb-viz/powerbi-host';
import en_US from './en-US.json';

export const I18N_TRANSLATIONS: Translations = {
    'en-US': { ...SETTINGS_PANE_TRANSLATIONS['en-US'], ...en_US }
};
