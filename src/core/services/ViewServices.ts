import { View } from 'vega';
import { getState } from '../../store';
import { getConfig } from '../utils/config';

/**
 * Service to manage interaction with the Vega View API that we don't want to keep in the store;
 * typically due to volatility issues, or specific methods that should not belong in there.
 */
export class ViewServices {
    // Max cap for any preview images generated via output
    readonly previewImageSize = getConfig().templates.previewImageSize;
    private view: View;

    /**
     * Sets the current Vega view
     */
    bindView = (view: View) => {
        this.view = view;
    };

    /**
     * Use the Vega View to export and size a suitable preview image (PNG)
     */
    setPreviewImage = (include = true) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let dataUri: string;
        img.onload = () => {
            if (include) {
                canvas.height = img.height;
                canvas.width = img.width;
                ctx.drawImage(img, 0, 0);
                dataUri = canvas.toDataURL('image/png');
            }
            getState().updateTemplatePreviewImage({
                include,
                dataUri
            });
        };
        this.view
            ?.toImageURL('png', this.getResizeScale())
            .then((i) => (img.src = i));
    };

    /**
     * For the visual viewport dimensions, calculate the correct scaling to use for preview
     * image generation
     */
    private getResizeScale() {
        const { width, height } = getState().visualViewportReport;
        return width >= height
            ? this.previewImageSize / width
            : this.previewImageSize / height;
    }
}
