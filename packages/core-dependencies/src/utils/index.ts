export {
    getBase64DataUri,
    getBase64ImagePngBlank,
    getBase64MimeType,
    isBase64Image
} from './base64';
export * from './type-conversion';
export * from './type-guards';

/**
 * Generate a new UUID.
 */
export const getNewUuid = () => crypto.randomUUID();
