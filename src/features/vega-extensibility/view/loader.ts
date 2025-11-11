import * as Vega from 'vega';
import { Loader } from 'vega';
import { getI18nValue } from '../../i18n';
import { FEATURES } from '../../../../config';
import { getVisualHost, launchUrl } from '../../visual-host';
import { getBase64ImagePngBlank } from '@deneb-viz/utils/base64';

/**
 * Custom Vega loader for Power BI.
 */
export const getVegaLoader = (): Loader => {
    const loader = Vega.loader();
    const externalUri = FEATURES.enable_external_uri;

    // Handle regular load requests. If we're blocking external URIs then only
    // permit this if it's a valid data URI. We avoid overriding the default
    // loader logic otherwise.
    if (!externalUri) {
        loader.load = (uri) => {
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
                launchUrl(uri);
                return Promise.reject({ href: uri });
            }
            // Default assumes we're loading images. If we're blocking
            // external URIs then only permit if it's valid base64
            default: {
                const sanitized = externalUri
                    ? uri
                    : (isDataUri(uri) && uri) || null;
                const href = sanitized || getBase64ImagePngBlank();
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
    getVisualHost().displayWarningIcon(
        getI18nValue('Loader_Warning_HoverText'),
        getI18nValue('Loader_Warning_DetailedText')
    );

/**
 * Test that supplied URI matches the data: protocol and should be whitelisted
 * by the loader.
 */
const isDataUri = (uri: string): boolean => {
    const dataUriRegex =
        /^data:([-\w]+\/[-+\w.]+)?(?:;[\w-]+=[-\w]+)*(?:;base64)?,[\s\S]*$/i;
    return dataUriRegex.test(uri);
};
