import { digest } from 'jsum';

/**
 * Hash algorithm used to generate the hash value.
 */
const HASH_ALGORITHM = 'SHA1';

/**
 * Hash digest used to generate the hash value.
 */
const HASH_DIGEST = 'base64';

/**
 * Generate a hash value for the given source object.
 */
export const getHashValue = (source: any) =>
    digest(source, HASH_ALGORITHM, HASH_DIGEST);
