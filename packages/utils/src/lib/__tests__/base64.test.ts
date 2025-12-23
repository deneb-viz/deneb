import { describe, expect, it } from 'vitest';
import {
    BASE64_BLANK_IMAGE_PNG,
    getBase64DataUri,
    getBase64ImagePngBlank,
    getBase64MimeType,
    isBase64Image
} from '../base64';

describe('getBase64DataUri', () => {
    it('should return the correct data URI', () => {
        const type = 'png';
        const expectedDataUri = 'data:image/png;base64,';
        const result = getBase64DataUri(type);
        expect(result).toBe(expectedDataUri);
    });
});

describe('getBase64MimeType', () => {
    it('should return the correct MIME type for png', () => {
        const type = 'png';
        const expectedMimeType = 'image/png';
        const result = getBase64MimeType(type);
        expect(result).toBe(expectedMimeType);
    });
});

describe('isBase64Image', () => {
    it('should return true if just the boilerplate URI is used', () => {
        const str = getBase64DataUri('png');
        const result = isBase64Image(str);
        expect(result).toBe(true);
    });
    it('should return true if the blank URI is used', () => {
        const str = getBase64ImagePngBlank();
        const result = isBase64Image(str);
        expect(result).toBe(true);
    });
    it('should return false if a regular URL is used', () => {
        const str = 'https://www.google.com';
        const result = isBase64Image(str);
        expect(result).toBe(false);
    });
    it('should return false if a regular URL is used with the base64 prefix', () => {
        const str = `${getBase64DataUri('png')}https://www.google.com`;
        const result = isBase64Image(str);
        expect(result).toBe(false);
    });
    it('should return false if a base64 URI is used with the wrong prefix', () => {
        const str = `data:image/jpeg;base64,${BASE64_BLANK_IMAGE_PNG}`;
        const result = isBase64Image(str);
        expect(result).toBe(false);
    });
});
