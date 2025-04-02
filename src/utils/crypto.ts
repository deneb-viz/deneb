import stringify from 'json-stringify-pretty-compact';
import * as sha1 from 'simple-sha1';

/**
 * Generate a hash value for the given source object.
 */
export const getHashValue = (source: any) => sha1.sync(stringify(source));
