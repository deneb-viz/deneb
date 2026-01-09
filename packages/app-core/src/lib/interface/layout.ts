import { PREVIEW_PANE_AREA_PADDING, ZOOM_FIT_BUFFER } from './constants';
import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';
import { getDenebState } from '../../state';

/**
 * Derive suitable scale to apply to visual preview if wishing to fit to preview area.
 */
export const getZoomToFitScale = () => {
    const {
            editor: { previewAreaViewport },
            interface: { embedViewport }
        } = getDenebState(),
        { height = 0, width = 0 } = embedViewport ?? {},
        previewWidth = getAdjustedPreviewAreaWidthForPadding(
            previewAreaViewport.width ?? 0
        ),
        previewHeight = getAdjustedPreviewAreaHeightForPadding(
            previewAreaViewport.height ?? 0
        ),
        scaleFactorWidth = Math.floor(
            100 / (width / (previewWidth - ZOOM_FIT_BUFFER))
        ),
        scaleFactorHeight = Math.floor(
            100 / (height / (previewHeight - ZOOM_FIT_BUFFER))
        ),
        { default: zDefault, max } = VISUAL_PREVIEW_ZOOM_CONFIGURATION;
    switch (true) {
        case willScaledDimensionFit(width, scaleFactorWidth, previewWidth) &&
            willScaledDimensionFit(height, scaleFactorWidth, previewHeight):
            return Math.min(scaleFactorWidth, max);
        case willScaledDimensionFit(width, scaleFactorHeight, previewWidth) &&
            willScaledDimensionFit(height, scaleFactorHeight, previewHeight):
            return Math.min(scaleFactorHeight, max);
        default:
            return zDefault;
    }
};

const getAdjustedPreviewAreaWidthForPadding = (size: number) =>
    size - PREVIEW_PANE_AREA_PADDING * 4;

const getAdjustedPreviewAreaHeightForPadding = (size: number) =>
    size - PREVIEW_PANE_AREA_PADDING * 2 - PREVIEW_PANE_AREA_PADDING * 4;

const willScaledDimensionFit = (size: number, scale: number, limit: number) =>
    Math.floor(size * (scale / 100)) <= limit;
