import reduce from 'lodash/reduce';

import { hostServices } from '../services';

export { i18nValue, TLocale };

/**
 * Convenience function allows i18n value lookup by key using host services. Will tokenise the optional array of values matching {i} pattern.
 */
const i18nValue = (key: string, tokens: (string | number)[] = []) =>
    reduce(
        tokens,
        (prev, value, idx) => {
            return prev.replace(`{${idx}}`, `${value}`);
        },
        hostServices.i18n.getDisplayName(key)
    );

// List of supported locales used for developer mode locale/formatting testing, without having to reconfigure the Power BI Service.
type TLocale = 'en-US' | 'de-DE' | 'fr-FR';
