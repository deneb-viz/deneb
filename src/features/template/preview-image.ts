import { getConfig } from '../../core/utils/config';

import { getState } from '../../store';

/**
 * Encoding method used for preview images.
 */
const IMAGE_TYPE = 'png';

/**
 * The base MIME-type used when creating preview images.
 */
const BASE64_MIME_TYPE = `image/${IMAGE_TYPE}`;

/**
 * MIME-type prefix for base64 PNG images.
 */
const BASE64_DATA_URL_PREFIX = `data:${BASE64_MIME_TYPE};base64,`;

/**
 * Blank image data URI; used to return placeholder images when remote URIs are
 * supplied.
 */
export const BASE64_BLANK_IMAGE = `${BASE64_DATA_URL_PREFIX}iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`;

/**
 * Convenience constant for our config, and represents the max cap for any
 * preview images generated from the Vega View API.
 */
export const PREVIEW_IMAGE_CAP_SIZE = getConfig().templates.previewImageSize;

/**
 * Based on template export configuration, prepare a preview image for export,
 * and dispatch it to the store.
 */
export const dispatchPreviewImage = (include: boolean) => {
    const { updateTemplatePreviewImage, editorView } = getState();
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let dataUri = BASE64_BLANK_IMAGE;
    img.onload = () => {
        if (include) {
            canvas.height = img.height;
            canvas.width = img.width;
            ctx.drawImage(img, 0, 0);
            dataUri = canvas.toDataURL(BASE64_MIME_TYPE);
        }
        updateTemplatePreviewImage({
            include,
            dataUri
        });
    };
    editorView
        ?.toImageURL(IMAGE_TYPE, getResizeScale())
        .then((i) => (img.src = i));
};

/**
 * Prepends the desired data URI & MIME-type to the base64 portion of an
 * encoded image.
 */
export const getCombinedBase64ImageWithMime = (base64: string) =>
    `${BASE64_DATA_URL_PREFIX}${base64.trim()}`;

/**
 * For the visual viewport dimensions, calculate the correct scaling to use for preview
 * image generation
 */
const getResizeScale = () => {
    const { width, height } = getState().visualViewportReport;
    return width >= height
        ? PREVIEW_IMAGE_CAP_SIZE / width
        : PREVIEW_IMAGE_CAP_SIZE / height;
};

/**
 * Test an image URL to determine if it's base64 or not.
 */
export const isBase64Image = (str: string) => {
    try {
        const b64 = str.replace(BASE64_DATA_URL_PREFIX, '').trim();
        return (
            btoa(atob(b64)) === b64 &&
            str.trim().indexOf(BASE64_DATA_URL_PREFIX) === 0
        );
    } catch (err) {
        return false;
    }
};
