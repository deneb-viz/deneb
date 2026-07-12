import { loader, type Loader } from 'vega';

/**
 * Whether a URI is an inline `data:` URI (the only thing the restrictive
 * loader permits).
 */
const isDataUri = (uri: string): boolean => /^data:/i.test(uri);

/**
 * A fail-closed Vega loader used when the platform contract supplies no loader
 * (`vegaLoader` defaults to `null`). It permits only inline `data:` URIs and
 * blocks every external fetch, so a missing loader can never silently fall
 * through to Vega's default loader — which fetches arbitrary external URLs.
 *
 * The Power BI visual always supplies its own gated loader; this is the safety
 * net for any embedder (or future regression) that omits one.
 */
export const getRestrictiveVegaLoader = (): Loader => {
    const restrictive = loader();
    // Block external content fetches outright.
    restrictive.load = () => Promise.resolve('');
    // Permit only inline data: URIs (e.g. embedded images); reject the rest.
    restrictive.sanitize = (uri: string) =>
        isDataUri(uri)
            ? Promise.resolve({ href: uri })
            : Promise.reject({ href: uri });
    return restrictive;
};
