import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import React from 'react';

export const getEditorHeadingIconClassName = (expanded: boolean) =>
    `editor-${expanded ? 'collapse' : 'expand'}`;

export const getViewModeViewportStyles = (
    viewport: IViewport,
    isEditor: boolean,
    zoomLevel: number,
    showViewportMarker: boolean
): React.CSSProperties => {
    const adjust = 4,
        resolved = `calc(100% - ${adjust}px)`;
    return {
        height: isEditor ? viewport.height : resolved,
        width: isEditor ? viewport.width : resolved,
        transform: `scale(${zoomLevel / 100})`, // TODO: better logic
        transformOrigin: '0% 0% 0px',
        border: showViewportMarker ? '1px dashed #b3b3b3' : null
    };
};
