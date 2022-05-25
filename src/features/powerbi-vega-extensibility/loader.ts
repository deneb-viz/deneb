import * as Vega from 'vega';
import { Loader } from 'vega';
import { hostServices } from '../../core/services';
import { i18nValue } from '../../core/ui/i18n';
import { isFeatureEnabled } from '../../core/utils/features';
import { BASE64_BLANK_IMAGE } from '../template';

/**
 * Custom Vega loader for Power BI.
 */
export const loader = (): Loader => {
    const loader = Vega.loader();
    const externalUri = isFeatureEnabled('enableExternalUri');

    // Handle regular load requests. If we're blocking external URIs then only
    // permit this if it's a valid data URI. We avoid overriding the default
    // loader logic otherwise.
    if (!externalUri) {
        loader.load = (uri, options) => {
            const href = (isDataUri(uri) && uri) || null;
            handleExternalResourceWarning(href, externalUri);
            return Promise.resolve(href);
        };
    }

    // Handle regular requests for images and hyperlinks.
    loader.sanitize = (uri, options) => {
        switch (options?.context) {
            // Hyperlinks will be delegated to the visual host
            case 'href': {
                hostServices.launchUrl(uri);
                return Promise.reject({ href: uri });
            }
            // Default assumes we're loading images. If we're blocking
            // external URIs then only permit if it's valid base64
            default: {
                const sanitized = externalUri
                    ? uri
                    : (isDataUri(uri) && uri) || null;
                const href = sanitized || BASE64_BLANK_IMAGE;
                handleExternalResourceWarning(sanitized, externalUri);
                return Promise.resolve({
                    href
                });
            }
        }
    };

    return loader;
};

/**
 * Displays an alert about external resources in the warning area of the
 * visual header, if they are disabled.
 */
const handleExternalResourceWarning = (href: string, externalUri: boolean) =>
    !href &&
    !externalUri &&
    hostServices.displayWarningIcon(
        i18nValue('Loader_Warning_HoverText'),
        i18nValue('Loader_Warning_DetailedText')
    );

/**
 * Test that supplied URI matches the data: protocol and should be whitelisted
 * by the loader.
 */
const isDataUri = (uri: string) =>
    !!uri.match(
        /^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i
    );
