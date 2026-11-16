import { type Translations } from '@deneb-viz/app-core';
import en_US from './settings-pane.en-US.json';

/**
 * Format pane strings that a visual's own settings pane shows too, keyed as
 * in the format pane, so a setting reads the same in both. Power BI receives
 * them with the rest of the shared format pane strings; see
 * `build/string-resources.cjs`.
 */
export const SETTINGS_PANE_TRANSLATIONS: Translations = {
    'en-US': en_US
};
