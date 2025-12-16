import { loader, type Loader } from 'vega';
import { getBase64ImagePngBlank } from '@deneb-viz/utils/base64';
import { getVisualHost } from '@deneb-viz/powerbi-compat/visual-host';
import { toBoolean } from '@deneb-viz/utils/type-conversion';
import { logDebug } from '@deneb-viz/utils/logging';
import { LoaderInitializationOptions } from './types';

/**
 * Custom Vega loader for Power BI.
 */
export const getVegaLoader = (options: LoaderInitializationOptions): Loader => {
    const { launchUrl, translations } = options;
    const thisLoader = loader();
    const externalUri = toBoolean(process.env.ALLOW_EXTERNAL_URI) ?? false;
    logDebug('Vega Runtime: Initializing custom Vega loader for Power BI.', {
        externalUri
    });

    // Handle regular load requests. If we're blocking external URIs then only
    // permit this if it's a valid data URI. We avoid overriding the default
    // loader logic otherwise.
    if (!externalUri) {
        thisLoader.load = (uri) => {
            const href = (isDataUri(uri) && uri) || '';
            handleExternalResourceWarning(href, externalUri, translations);
            return Promise.resolve(href);
        };
    }

    // Handle regular requests for images and hyperlinks.
    thisLoader.sanitize = (uri, sanitizeOptions) => {
        switch (sanitizeOptions?.context) {
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
                handleExternalResourceWarning(
                    sanitized,
                    externalUri,
                    translations
                );
                return Promise.resolve({
                    href
                });
            }
        }
    };

    return thisLoader;
};

/**
 * Displays an alert about external resources in the warning area of the
 * visual header, if they are disabled.
 */
const handleExternalResourceWarning = (
    href: string | null,
    externalUri: boolean,
    translations: LoaderInitializationOptions['translations']
) =>
    !href &&
    !externalUri &&
    getVisualHost().displayWarningIcon(
        translations.hoverText,
        translations.detailedText
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
