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
