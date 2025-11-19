import powerbi from 'powerbi-visuals-api';

let i18n: powerbi.extensibility.ILocalizationManager;
let locale: string;

/**
 * Use to bind the visual Localization manager to this API for use in the application lifecycle.
 *
 * I18N SERVICES WILL NOT BE ACCESSIBLE UNLESS THIS IS BOUND.
 *
 * @remarks This has been moved in its singleton approach to ensure that we continue to support the app in its current
 * state and make refactoring as seamless as possibler. This approach will break in future versions so that Power BI
 * i18n services are injected as a dependency and we have 'native' i18n support for everything core to the UI.
 */
export const I18nServices = {
    bind: (service: powerbi.extensibility.visual.VisualConstructorOptions) => {
        i18n = service.host.createLocalizationManager();
        locale = service.host.locale;
    },
    update: (newLocale: string) => {
        locale = newLocale;
    }
};
Object.freeze(I18nServices);

/**
 * Convenience function allows i18n value lookup by key using host services. Will tokenize the optional array of
 * values matching {i} pattern.
 */
export const getI18nValue = (
    key: string,
    tokens?: string | number | (string | number)[]
) => {
    const list: (string | number)[] =
        tokens == null ? [] : Array.isArray(tokens) ? tokens : [tokens];

    return list.reduce<string>(
        (prev, value, idx) => String(prev).replace(`{${idx}}`, String(value)),
        i18n.getDisplayName(key)
    );
};

/**
 * Get the resolved local for the visual. If using debugging, this will resolve from the properties pane, otherwise it
 * will resolve from the visual host (as expected).
 */
export const getLocale = () => locale;

/**
 * Get the localization manager for the visual.
 */
export const getLocalizationManager = () => i18n;
