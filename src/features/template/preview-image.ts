import { View } from 'vega';
import { getConfig } from '../../core/utils/config';

import { getState } from '../../store';

const imageType = 'png';

const base64MimeType = `image/${imageType}`;

/**
 * MIME-type prefix for base64 PNG images.
 */
const base64PngPrefix = `data:${base64MimeType};base64,`;

/**
 * Blank image data URI; used to return placeholder images when remote URIs are
 * supplied.
 */
export const blankImageBase64 = `${base64PngPrefix}iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`;

/**
 * Based on template export configuration, prepare a preview image for export,
 * and dispatch it to the store.
 */
export const dispatchPreviewImage = (include: boolean) => {
    const { updateTemplatePreviewImage, editorView } = getState();
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let dataUri = blankImageBase64;
    img.onload = () => {
        if (include) {
            canvas.height = img.height;
            canvas.width = img.width;
            ctx.drawImage(img, 0, 0);
            dataUri = canvas.toDataURL(base64MimeType);
        }
        updateTemplatePreviewImage({
            include,
            dataUri
        });
    };
    editorView
        ?.toImageURL(imageType, getResizeScale())
        .then((i) => (img.src = i));
};

/**
 * For the visual viewport dimensions, calculate the correct scaling to use for preview
 * image generation
 */
const getResizeScale = () => {
    const { width, height } = getState().visualViewportReport;
    return width >= height
        ? previewImageCapSize / width
        : previewImageCapSize / height;
};

/**
 * Test an image URL to determine if it's base64 or not.
 */
export const isBase64Image = (str: string) => {
    try {
        let b64 = str.replace(base64PngPrefix, '');
        return btoa(atob(b64)) == b64;
    } catch (err) {
        return false;
    }
};

/**
 * Convenience constant for our config, and represents the max cap for any
 * preview images generated from the Vega View API.
 */
export const previewImageCapSize = getConfig().templates.previewImageSize;
