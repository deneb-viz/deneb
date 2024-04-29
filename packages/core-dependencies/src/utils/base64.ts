import { BASE64_BLANK_IMAGE_PNG, BASE64_MIME_TYPE_PNG } from '../constants';
import { TBase64DataEncoding } from '../definitions';

/**
 * For the given data type, create a data URL prefix for base64 data.
 */
export const getBase64DataUri = (type: TBase64DataEncoding) => `data:${getBase64MimeType(type)};base64,`;

/**
 * For the given data type, return a valid MIME type string.
 */
export const getBase64MimeType = (type: TBase64DataEncoding) => {
    switch (type) {
        case 'png':
            return BASE64_MIME_TYPE_PNG;
    }
};

/**
 * Return a base64-encoded PNG image data URI that represents a blank image.
 */
export const getBase64ImagePngBlank = () => `${getBase64DataUri('png')}${BASE64_BLANK_IMAGE_PNG}`;

/**
 * Test an image URL to determine if it's base64 or not.
 */
export const isBase64Image = (str: string) => {
    const prefix = getBase64DataUri('png');
    try {
        const b64 = str.replace(prefix, '').trim();
        return btoa(atob(b64)) === b64 && str.trim().indexOf(prefix) === 0;
    } catch (err) {
        return false;
    }
};
