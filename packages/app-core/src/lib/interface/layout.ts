import { PREVIEW_PANE_AREA_PADDING, ZOOM_FIT_BUFFER } from './constants';
import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';
import { getDenebState } from '../../state';
import type { ContainerViewport } from './types';

/**
 * Derive suitable scale to apply to visual preview if wishing to fit to preview area.
 *
 * Thin store-bound wrapper around {@link computeZoomToFitScale}, which holds
 * the pure computation and is independently unit-tested.
 */
export const getZoomToFitScale = () => {
    const {
        editor: { previewAreaViewport },
        interface: { embedViewport }
    } = getDenebState();
    return computeZoomToFitScale({ previewAreaViewport, embedViewport });
};

type ZoomToFitScaleParams = {
    previewAreaViewport: ContainerViewport;
    embedViewport: ContainerViewport | null;
};

/**
 * Pure scale-to-fit computation. {@link getZoomToFitScale} is the
 * store-bound wrapper; this version takes inputs as parameters so the
 * math can be unit-tested without mocking Zustand.
 *
 * Returns `zDefault` (100%) when any input dimension is non-positive
 * (the unhydrated `{0, 0}` initial-state path that produced the original
 * "Fit shrinks the visual" bug). Otherwise returns the scale needed to
 * fit `embedViewport` inside `previewAreaViewport`, clamped to
 * `[VISUAL_PREVIEW_ZOOM_CONFIGURATION.min, max]`. See the test file for
 * the bug narrative the guard prevents.
 */
export const computeZoomToFitScale = ({
    previewAreaViewport,
    embedViewport
}: ZoomToFitScaleParams) => {
    const { default: zDefault, min, max } = VISUAL_PREVIEW_ZOOM_CONFIGURATION;
    const { height = 0, width = 0 } = embedViewport ?? {};
    const { width: previewAreaWidth, height: previewAreaHeight } =
        previewAreaViewport;
    // Bail out to the default when any input dimension is non-positive -
    // running the math on zero/negative inputs would otherwise be caught
    // only by the downstream output clamp, masking the real issue.
    if (
        previewAreaWidth <= 0 ||
        previewAreaHeight <= 0 ||
        width <= 0 ||
        height <= 0
    ) {
        return zDefault;
    }
    const previewWidth = getAdjustedPreviewAreaWidthForPadding(previewAreaWidth);
    const previewHeight =
        getAdjustedPreviewAreaHeightForPadding(previewAreaHeight);
    const scaleFactorWidth = Math.floor(
        100 / (width / (previewWidth - ZOOM_FIT_BUFFER))
    );
    const scaleFactorHeight = Math.floor(
        100 / (height / (previewHeight - ZOOM_FIT_BUFFER))
    );
    const clamp = (value: number) => Math.max(min, Math.min(value, max));
    switch (true) {
        case willScaledDimensionFit(width, scaleFactorWidth, previewWidth) &&
            willScaledDimensionFit(height, scaleFactorWidth, previewHeight):
            return clamp(scaleFactorWidth);
        case willScaledDimensionFit(width, scaleFactorHeight, previewWidth) &&
            willScaledDimensionFit(height, scaleFactorHeight, previewHeight):
            return clamp(scaleFactorHeight);
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
