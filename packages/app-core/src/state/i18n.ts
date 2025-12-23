import { type StateCreator } from 'zustand';
import { mergician } from 'mergician';

import { type StoreState } from './state';
import { en_US } from '../i18n';
import type { I18nLocale, Translations } from '../lib/i18n';

/**
 * Function signature for translation function
 */
export type Translate = (
    key: string,
    tokens?: (string | number | undefined)[]
) => string;

/**
 * Slice of the application state that handles internationalization (i18n).
 */
export type I18nSliceProperties = {
    /**
     * The currently selected locale.
     */
    locale: I18nLocale;
    /**
     * Translations for all locales.
     */
    translations: Translations;
    /**
     * Set the current locale.
     * @param language The new locale to set.
     */
    setLocale: (payload: SetLocalePayload) => void;
    /**
     * Get the desired translation for a key for the current locale.
     * @param key The translation key to look up.
     * @param tokens Optional tokens to replace in the translation string.
     * @returns The translated string, or the original string if no translation is found.
     */
    translate: Translate;
};

export type I18nSlice = {
    i18n: I18nSliceProperties;
};

type SetLocalePayload = {
    locale: I18nLocale;
    translationExtensions?: Translations[];
};

/**
 * I18n translations by language
 */
const I18N_TRANSLATIONS: Translations = {
    'en-US': en_US
};

/**
 * The default locale to fall back to if a translation is missing.
 */
const DEFAULT_LOCALE: I18nLocale = 'en-US';

export const createI18nSlice = (): StateCreator<
    StoreState,
    [['zustand/devtools', never]],
    [],
    I18nSlice
> => {
    const translations = I18N_TRANSLATIONS;
    return (set, get) => ({
        i18n: {
            locale: navigator.language as I18nLocale,
            translations,
            setLocale: (payload: SetLocalePayload) => {
                const { locale, translationExtensions = [] } = payload;
                const currentTranslations = get().i18n.translations;
                let updatedTranslations = currentTranslations;
                if (translationExtensions.length > 0) {
                    updatedTranslations = mergician(
                        currentTranslations,
                        ...translationExtensions
                    ) as Translations;
                }
                set((state) => ({
                    i18n: {
                        ...state.i18n,
                        locale,
                        translations: updatedTranslations
                    }
                }));
            },
            translate: (key, tokens) => {
                const { locale, translations } = get().i18n;
                let translation =
                    translations[locale]?.[key] ||
                    translations[DEFAULT_LOCALE]?.[key] ||
                    key;
                if (tokens && tokens.length > 0) {
                    tokens.forEach((token, index) => {
                        translation = translation.replace(
                            `{${index}}`,
                            String(token)
                        );
                    });
                }
                return translation;
            }
        }
    });
};
