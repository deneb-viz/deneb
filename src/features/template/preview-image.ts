import { TEMPLATE_PREVIEW_IMAGE_MAX_SIZE } from '../../../config';

import { getState } from '../../store';
import { VegaViewServices } from '../vega-extensibility';

import { utils } from '@deneb-viz/core-dependencies';

/**
 * Encoding method used for preview images.
 */
const IMAGE_TYPE = 'png';

/**
 * Based on template export configuration, prepare a preview image for export,
 * and dispatch it to the store.
 */
export const dispatchPreviewImage = (includePreviewImage: boolean) => {
    const {
        export: { setPreviewImage }
    } = getState();
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let previewImageBase64PNG = utils.getBase64ImagePngBlank();
    img.onload = () => {
        if (includePreviewImage) {
            canvas.height = img.height;
            canvas.width = img.width;
            ctx.drawImage(img, 0, 0);
            previewImageBase64PNG = canvas.toDataURL(
                utils.getBase64MimeType(IMAGE_TYPE)
            );
        }
        setPreviewImage({
            includePreviewImage,
            previewImageBase64PNG
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
    `${utils.getBase64DataUri('png')}${base64?.trim() ?? ''}`;

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
