/**
 * Supported encodings for base64
 */
export type TBase64Data = 'png';

/**
 * The base MIME-type used when creating images from data URLs.
 */
const BASE64_MIME_TYPE_PNG = 'image/png';

/**
 * For the given data type, create a data URL prefix for base64 data.
 */
export const getBase64DataUri = (type: TBase64Data) =>
    `data:${getBase64MimeType(type)};base64,`;

/**
 * For the given data type, return a valid MIME type string.
 */
export const getBase64MimeType = (type: TBase64Data) => {
    switch (type) {
        case 'png':
            return BASE64_MIME_TYPE_PNG;
    }
};
