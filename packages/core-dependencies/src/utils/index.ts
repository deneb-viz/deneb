export { getBase64DataUri, getBase64ImagePngBlank, getBase64MimeType, isBase64Image } from './base64';
export { getEscapedReplacerPattern } from './field-tracking';
export * from './type-guards';

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a new UUID.
 */
export const getNewUuid = () => crypto.randomUUID();
