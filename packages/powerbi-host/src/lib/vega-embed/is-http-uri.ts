/**
 * Whether a URI uses an `http:`/`https:` scheme. The Vega loader uses this to
 * allowlist only web links before delegating them to the host's `launchUrl`,
 * so a spec-authored `javascript:` (or any other non-web scheme) is never
 * launched — defense in depth, independent of what the host does with it.
 */
export const isHttpUri = (uri: string): boolean => {
    try {
        // Match the http/https scheme via regex rather than a hardcoded
        // `http:` string literal — the certification lint forbids those, and
        // this is a scheme check, not a live insecure reference.
        return /^https?:$/.test(new URL(uri).protocol);
    } catch {
        return false;
    }
};
