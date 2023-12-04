import { TEMPLATE_PREVIEW_IMAGE_MAX_SIZE } from '../../../config';

import { getState } from '../../store';
import { getBase64DataUri } from '../../utils';
import { getBase64MimeType } from '../../utils/base64';
import { VegaViewServices } from '../vega-extensibility';

/**
 * Encoding method used for preview images.
 */
const IMAGE_TYPE = 'png';

/**
 * MIME-type prefix for base64 PNG images.
 */
const BASE64_DATA_URL_PREFIX = getBase64DataUri(IMAGE_TYPE);

/**
 * Blank image data URI; used to return placeholder images when remote URIs are
 * supplied.
 */
export const BASE64_BLANK_IMAGE = `${BASE64_DATA_URL_PREFIX}iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`;

/**
 * Based on template export configuration, prepare a preview image for export,
 * and dispatch it to the store.
 */
export const dispatchPreviewImage = (include: boolean) => {
    const { updateTemplatePreviewImage } = getState();
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let dataUri = BASE64_BLANK_IMAGE;
    img.onload = () => {
        if (include) {
            canvas.height = img.height;
            canvas.width = img.width;
            ctx.drawImage(img, 0, 0);
            dataUri = canvas.toDataURL(getBase64MimeType(IMAGE_TYPE));
        }
        updateTemplatePreviewImage({
            include,
            dataUri
        });
    };
    VegaViewServices.getView()
        ?.toImageURL(IMAGE_TYPE, getResizeScale())
        .then((i) => (img.src = i));
};

/**
 * Prepends the desired data URI & MIME-type to the base64 portion of an
 * encoded image.
 */
export const getCombinedBase64ImageWithMime = (base64: string) =>
    `${BASE64_DATA_URL_PREFIX}${base64?.trim() ?? ''}`;

/**
 * For the visual viewport dimensions, calculate the correct scaling to use for preview
 * image generation
 */
const getResizeScale = () => {
    const { width, height } = getState().visualViewportReport;
    return width >= height
        ? TEMPLATE_PREVIEW_IMAGE_MAX_SIZE / width
        : TEMPLATE_PREVIEW_IMAGE_MAX_SIZE / height;
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
