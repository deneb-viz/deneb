/**
 * List of supported locales used for developer mode locale/formatting testing,
 * without having to reconfigure the Power BI Service.
 */
export type TLocale = 'en-US' | 'de-DE' | 'fr-FR';

/**
 * Represents all i18n date and time formats available for D3 that we can add
 * to the visual.
 */
export interface ILocaleConfiguration {
    default: string;
    format: ILocaleFormatConfiguration;
    timeFormat: ILocaleTimeConfiguration;
}

interface ILocaleFormatConfiguration {
    [key: string]: Record<string, unknown>;
}

interface ILocaleTimeConfiguration {
    [key: string]: Record<string, unknown>;
}
