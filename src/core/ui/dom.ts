import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import React from 'react';

const viewportAdjust = 4;

const calculateZoomLevelPercent = (zoomLevel: number) => zoomLevel / 100;

export const getEditorHeadingIconClassName = (expanded: boolean) =>
    `editor-${expanded ? 'collapse' : 'expand'}`;

export const getViewModeViewportStyles = (
    viewport: IViewport,
    isEditor: boolean,
    zoomLevel: number,
    showViewportMarker: boolean
): React.CSSProperties => {
    const resolved = `calc(100% - ${viewportAdjust}px)`,
        scale = calculateZoomLevelPercent(zoomLevel);
    return {
        height: isEditor ? viewport.height : resolved,
        width: isEditor ? viewport.width : resolved,
        transform: `scale(${scale})`,
        transformOrigin: '0% 0% 0px',
        border: showViewportMarker ? '2px dashed #b3b3b3' : null
    };
};
