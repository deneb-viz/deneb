/**
 * Supported translation locales for the application.
 */
export type I18nLocale = 'en-US';

/**
 * I18n translations for the application
 * These are defined in @deneb-viz/core/resources/i18n
 */
export type Translations = {
    [key in I18nLocale]: { [key: string]: string };
};

/**
 * Represents all i18n date and time formats available for D3 that we can add when embedding Vega based on app locale.
 */
export type LocaleConfiguration = {
    default: string;
    format: LocaleFormatConfiguration;
    timeFormat: LocaleTimeConfiguration;
};

type LocaleFormatConfiguration = {
    [key: string]: Record<string, unknown>;
};

type LocaleTimeConfiguration = {
    [key: string]: Record<string, unknown>;
};
