import stringify from 'json-stringify-pretty-compact';
import sha1 from 'simple-sha1';

/**
 * Generate a new UUID. Prefers `crypto.randomUUID()` (available in secure
 * contexts, which the Power BI sandbox iframe is). Falls back to a
 * `Math.random`-based v4 shape only if a host lacks it — acceptable because
 * every consumer is non-security (template ids, renderId, worker jobIds).
 */
export function getNewUuid() {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-Nxxx-xxxxxxxxxxxx'
        .replace(/x/g, () => ((Math.random() * 16) | 0).toString(16))
        .replace(/N/g, () => ((Math.random() * 4) | 8).toString(16));
}

/**
 * Generate a hash value for the given source object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getHashValue = (source: any) => sha1.sync(stringify(source));
