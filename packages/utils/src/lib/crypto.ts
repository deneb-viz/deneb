import stringify from 'json-stringify-pretty-compact';
import sha1 from 'simple-sha1';

/**
 * Generate a new UUID.
 */
export function getNewUuid() {
    return 'xxxxxxxx-xxxx-4xxx-Nxxx-xxxxxxxxxxxx'
        .replace(/x/g, () => ((Math.random() * 16) | 0).toString(16))
        .replace(/N/g, () => ((Math.random() * 4) | (0 + 8)).toString(16));
}

/**
 * Generate a hash value for the given source object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getHashValue = (source: any) => sha1.sync(stringify(source));
