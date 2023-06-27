import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import EditMode = powerbi.EditMode;
import ViewMode = powerbi.ViewMode;
import React from 'react';
import { getConfig } from '../utils/config';
import DisplaySettings from '../../properties/DisplaySettings';
import {
    resolveObjectProperties,
    updateObjectProperties
} from '../utils/properties';

const viewportAdjust = 4;

export const getReportViewport = (
    viewport: IViewport,
    displaySettings: DisplaySettings
) => ({
    height:
        (displaySettings.viewportHeight || viewport.height) - viewportAdjust,
    width: (displaySettings.viewportWidth || viewport.width) - viewportAdjust
});

export const zoomConfig = getConfig().zoomLevel;

const calculateZoomLevelPercent = (zoomLevel: number) => zoomLevel / 100;

export const getDefaultZoomLevel = () => zoomConfig.default;

/**
 * Manages the increase of zoom level in the visual editor by increasing it by step value.
 */
export const getZoomInLevel = (value: number) => {
    const { step, max } = zoomConfig,
        level = Math.min(max, Math.floor((value + step) / 10) * 10);
    return (value < max && level) || level;
};

/**
 * Manages the decrease of zoom level in the visual editor by decreasing it by step value.
 */
export const getZoomOutLevel = (value: number) => {
    const { step, min } = zoomConfig,
        level = Math.max(min, Math.ceil((value - step) / 10) * 10);
    return (value > min && level) || level;
};

export const getEditorHeadingIconClassName = (expanded: boolean) =>
    `editor-${expanded ? 'collapse' : 'expand'}`;

/**
 * Convert a value intended for pt to a px equivalent.
 */
export const ptToPx = (value: number) => value * (1 / 3 + 1);

/**
 * For suitable events, ensure that the visual viewport is correctly resolved and persisted. This will allow us to keep the
 * viewport upon re-initialisation (e.g. if swapping visuals out or reloading the dev visual).
 */
export const resolveReportViewport = (
    viewport: IViewport,
    viewMode: ViewMode,
    editMode: EditMode,
    displaySettings: DisplaySettings
) => {
    if (
        editMode === EditMode.Default &&
        viewMode === ViewMode.Edit &&
        (displaySettings.viewportHeight !== viewport.height ||
            displaySettings.viewportWidth !== viewport.width)
    ) {
        updateObjectProperties(
            resolveObjectProperties([
                {
                    objectName: 'display',
                    properties: [
                        {
                            name: 'viewportHeight',
                            value: viewport.height
                        },
                        {
                            name: 'viewportWidth',
                            value: viewport.width
                        }
                    ]
                }
            ])
        );
    }
};
